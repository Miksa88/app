// ============================================================================
// syncEngine — KRITICAN modul. Centralni orchestrator sync pravila.
// Spec: 03_INTEGRATION_LAYER.md Sekcija 3 (Sync Engine pravila)
// ============================================================================
//
// Ovaj fajl je MOZAK sistema. Sva mutacija UserStatus-a treba da prodje
// kroz processDailyCheckIn() ili runSyncRules() — direktni write u DB
// mimo ovih funkcija krsi Pravilo 2 iz spec-a 03 (jedan writer po podatku).
//
// IDEMPOTENTNOST: runSyncRules je idempotentan. Sve flag-ove rekompjutuje
// iz baseline stanja (ne akumulira). Pokretanje 2× sa istim ulazom daje
// isti izlaz — testirano u syncEngine.test.ts.
//
// REDOSLED PRAVILA: redosled u runSyncRules je SEMANTICKI vazan
// (kasniji ima prioritet u prepisivanju calorie target-a). Ne menjati
// bez razmisljanja.
// ============================================================================

import type { UserStatus, SyncRuleName } from '@/types/userStatus';
import type { SystemEvent } from '@/types/events';

import { recalcCalorieTarget } from '@/utils/nutrition/calorieTarget';
import { calcMacroSplit } from '@/utils/nutrition/macroSplit';
import { applyPathologyMacroOverride } from '@/utils/nutrition/pathologyMacroOverride';
import { applySmartCut } from '@/utils/nutrition/smartCut';
import { applyRefeedDay } from '@/utils/nutrition/emergencyRefeed';
import { applyBiofeedbackReactiveRules } from '@/utils/nutrition/biofeedbackReactiveRules';
import { calcRedFlags } from './redFlags';
import { EventBus } from './eventBus';

// ============================================================================
// Konstante za sync rules (Sekcija 3.2)
// ============================================================================

const SLEEP_THRESHOLD_FATIGUE = 6;          // < 6h = fatigue
const STRESS_THRESHOLD_FATIGUE = 4;          // > 4 = fatigue
const RECOVERY_THRESHOLD_HYDRATION = 0.85;  // < 0.85 + dehidracija = block
const HYDRATION_PERCENT_THRESHOLD = 0.70;   // < 70% target
const HYDRATION_BLOCK_HOURS = 24;
const METABOLIC_NOISE_BLOCK_DAYS = 3;
const ILLNESS_RECOVERY_PENALTY = 0.15;      // -0.15 na recovery multiplier
const TRAINING_INTENSITY_REDUCE_LUTEAL = 0.05;
const TRAINING_VOLUME_REDUCE_FATIGUE = 0.15;

// Spec 03 Sekcija 3.2 Rule 1 — eksplicitno +38g carbs u lutealnoj fazi
// (150 kcal / 4 kcal/g = 37.5g, zaokruzeno na 38g — direktno carb craving
// support, ne samo prirodno preko macroSplit-a)
const LUTEAL_EXPLICIT_CARB_BONUS_G = 38;

// Helper za async-coerce — neki rule-ovi emit event, neki ne
// ============================================================================
// runSyncRules — pokrene svih 8 pravila redom + finalizuje calorie target
// Spec: 03 Sekcija 3.2
// ============================================================================
//
// IMPORTANT: pre svakog rule-a proveriti clientOverrides — trener moze da
// iskljuci pojedinacno pravilo za 1-na-1 klijentkinju (Faza 4 UI).
//
// Redosled je SEMANTICKI vazan:
//   1 Hormonal (luteal +150 carbs)
//   2 Fatigue (deficit → maintenance)
//   3 Deload (deficit/recomp → maintenance)
//   4 Return from Break (deficit → 0.92)
//   5 Hydration first (block macro changes)
//   6 Metabolic noise (block progression)
//   7 Illness (deficit → 0.95, recovery -0.15)
//   8 Cycle menstrual (weightDataReliable = false)
// Posle: rekompjutuj calorie target iz svih flag-ova (idempotentno).

export async function runSyncRules(status: UserStatus): Promise<UserStatus> {
  let s = cloneStatus(status);

  // Reset transient flags pre nego sto pravila ih ponovo postavljaju
  // (idempotentno — svaki put se rekonstruisu iz trenutnog state-a)
  s.nutrition._fatigueSyncActive = false;
  s.nutrition._deloadSyncActive = false;
  s.nutrition._returnSyncActive = false;
  s.bio.weightDataReliable = true;

  // Pravila — svako prima i vraca status, neki emit event-e
  s = await applyHormonalSync(s);
  s = await applyFatigueSync(s);
  s = applyDeloadSync(s);
  s = applyReturnFromBreakSync(s);
  s = await applyHydrationFirstSync(s);
  s = applyMetabolicNoiseBlock(s);
  s = applyIllnessPenaltySync(s);
  s = applyCycleMenstrualSync(s);

  // Finalizuj calorie target — idempotentno (uvek rekonstruisan iz flag-ova)
  s.nutrition.currentCalorieTarget = recalcCalorieTarget({
    tdee: s.nutrition.tdee,
    targetMode: s.nutrition.targetMode,
    isInDeload: s.training.isInDeload,
    isInReturnFromBreak: s.training.isInReturnFromBreak,
    isInIllnessPause: s.training.activePauseEvent?.type === 'illness',
    fatigueSyncActive: s.nutrition._fatigueSyncActive,
    isInDietBreak: s.training.dietBreakActive,    // SREDNJE_NAPREDNE_V2 §5.4
    cyclePhase: s.bio.cyclePhase,
    metabolicConditions: s.nutrition.metabolicFilter,  // pocetnici.md §1.1: Hashimoto cap
  });

  // Rekompjutuj makro split iz novog targeta + patoloskih override-a
  const experienceLevel = s.training.position.startsWith('intermediate')
    ? 'intermediate'
    : 'beginner';
  const baseMacros = calcMacroSplit({
    weightKg: s.bio.currentWeightMA5,
    totalCalories: s.nutrition.currentCalorieTarget,
    experienceLevel,
  });
  const finalMacros = applyPathologyMacroOverride({
    macros: baseMacros,
    totalCalories: s.nutrition.currentCalorieTarget,
    conditions: s.nutrition.metabolicFilter,
  });
  s.nutrition.macros = {
    proteinG: finalMacros.proteinG,
    carbsG: finalMacros.carbsG,
    fatG: finalMacros.fatG,
  };

  // Smart Cut step-down (pocetnici.md §3.8 + SREDNJE_NAPREDNE_V2 §3.9).
  // Smart Cut se primenjuje SAMO na deficit/recomposition (bulk i maintenance
  // ne idu kroz cut hijerarhiju). SREDNJE_NAPREDNE_V2 §5.4: Diet Break PAUZIRA
  // Smart Cut — "Šta se NE RADI: Smart Cut" tokom 2-nedeljne pauze.
  // Biofeedback reactive rules (pocetnici.md §4.3) — primenjuju se PRE Smart
  // Cut-a da pauseSmartCut može da preskoči blok. Sleep quality skala (1-10)
  // se izvodi iz sleep hours: <5h → quality<5 (heuristika).
  const sleepQualityProxy = s.bio.sleepLast7DaysAvg < 5 ? 3 : 8;
  const biofeedback = applyBiofeedbackReactiveRules({
    pumpScore: s.bio.latestPumpScore ?? null,
    sleepQualityScore: sleepQualityProxy,
    cyclePhase: s.bio.cyclePhase,
    currentSmartCutStep: s.nutrition.currentSmartCutStep,
    libidoScore: s.bio.latestLibidoScore ?? null,
    waterRetentionScore: s.bio.latestWaterRetentionScore ?? null,
  });

  // Pump < 5 → +1 šaka ovsa Obrok 5 (~25g carbs, triptofan→serotonin za san)
  if (biofeedback.obrok5OatsHandfulBonus > 0) {
    s.nutrition.macros.carbsG += 25 * biofeedback.obrok5OatsHandfulBonus;
  }

  // Smart Cut step-down (pocetnici.md §3.8 + SREDNJE_NAPREDNE_V2 §3.9).
  // Smart Cut se primenjuje SAMO na deficit/recomposition (bulk i maintenance
  // ne idu kroz cut hijerarhiju). SREDNJE_NAPREDNE_V2 §5.4: Diet Break PAUZIRA
  // Smart Cut. biofeedback.pauseSmartCut (libido pad) takođe pauzira.
  if (s.nutrition.currentSmartCutStep > 0 &&
      !s.training.dietBreakActive &&
      !biofeedback.pauseSmartCut &&
      (s.nutrition.targetMode === 'deficit' || s.nutrition.targetMode === 'recomposition')) {
    const cutResult = applySmartCut({
      macros: s.nutrition.macros,
      totalCalories: s.nutrition.currentCalorieTarget,
      weightKg: s.bio.currentWeightMA5,
      step: s.nutrition.currentSmartCutStep,
      experienceLevel,
    });
    s.nutrition.macros = cutResult.macros;
    s.nutrition.currentCalorieTarget = cutResult.totalCalories;
  }

  // Rule 1 explicit carb bonus (Spec 03 Sekcija 3.2 Rule 1):
  //   `status.nutrition.macros.carbsG += 38`
  // Idempotentno jer macros se uvek rekomputuje iz baseline-a u svakoj
  // runSyncRules invokaciji. Ne primenjuje se ako:
  //   - hormonal_sync je u clientOverrides (trener iskljucio)
  //   - klijentkinja ima IR (carb cap 23% kcal NADVLADAVA luteal craving)
  if (s.bio.cyclePhase === 'luteal' &&
      !isRuleDisabled(s, 'hormonal_sync') &&
      !s.nutrition.metabolicFilter.includes('insulin_resistance')) {
    s.nutrition.macros.carbsG += LUTEAL_EXPLICIT_CARB_BONUS_G;
  }

  // Emergency Refeed dan (pocetnici.md §5.1) — overrides finalne makroe.
  // Trigger se postavlja u check-in handler-u; ovde samo primenjujemo override.
  // Refeed: +50% carbs, -40% fats, protein nepromenjen.
  if (s.nutrition.activeRefeedDay) {
    const refeed = applyRefeedDay(s.nutrition.macros);
    s.nutrition.macros = refeed.macros;
    s.nutrition.currentCalorieTarget = refeed.totalCalories;
  }

  return s;
}

// ============================================================================
// RULE 1 — Hormonal Sync (Lutealna faza)
// Spec 03 Sekcija 3.2 Rule 1
// ============================================================================
//
// Lutealna faza povisava BMR ~5-10%. Algoritam dodaje +150 kcal (kroz
// recalcCalorieTarget) i signalizira training modulu da smanji intenzitet 5%.

async function applyHormonalSync(status: UserStatus): Promise<UserStatus> {
  if (isRuleDisabled(status, 'hormonal_sync')) return status;
  if (status.bio.cyclePhase !== 'luteal') return status;

  // Kalorijski bonus se vec radi u recalcCalorieTarget kroz cyclePhase param.
  // Ovde samo signaliziramo training modulu da smanji intenzitet.
  await EventBus.emit({
    type: 'TRAINING_INTENSITY_REDUCE',
    clientId: status.clientId,
    reason: 'luteal_phase',
    reduction: TRAINING_INTENSITY_REDUCE_LUTEAL,
  });

  return status;
}

// ============================================================================
// RULE 2 — Fatigue Sync (San + Stres)
// Spec 03 Sekcija 3.2 Rule 2
// ============================================================================
//
// Ako san < 6h ILI stres > 4: smanji training volume i prebaci nutrition na
// maintenance (zastita metabolizma — agresivni deficit + nedostatak oporavka =
// metabolicka odbrana).

async function applyFatigueSync(status: UserStatus): Promise<UserStatus> {
  if (isRuleDisabled(status, 'fatigue_sync')) return status;

  const isFatigued =
    status.bio.sleepLast7DaysAvg < SLEEP_THRESHOLD_FATIGUE ||
    status.bio.stressLast7DaysAvg > STRESS_THRESHOLD_FATIGUE;

  if (!isFatigued) return status;

  await EventBus.emit({
    type: 'TRAINING_VOLUME_REDUCE',
    clientId: status.clientId,
    reason: 'low_recovery',
    reduction: TRAINING_VOLUME_REDUCE_FATIGUE,
  });

  // Mark flag — calorie target se prepravlja u glavnoj funkciji
  return {
    ...status,
    nutrition: { ...status.nutrition, _fatigueSyncActive: true },
  };
}

// ============================================================================
// RULE 3 — Deload Sync (Training → Nutrition)
// Spec 03 Sekcija 3.2 Rule 3
// ============================================================================
//
// Kad training generise deload nedelju, nutrition automatski na maintenance.
// Lean_bulk OSTAJE (klijentkinja na bulk-u i u deloadu treba kalorije).

function applyDeloadSync(status: UserStatus): UserStatus {
  if (isRuleDisabled(status, 'deload_sync')) return status;
  if (!status.training.isInDeload) return status;

  if (status.nutrition.targetMode === 'lean_bulk') return status;

  return {
    ...status,
    nutrition: { ...status.nutrition, _deloadSyncActive: true },
  };
}

// ============================================================================
// RULE 4 — Return from Break Sync
// Spec 03 Sekcija 3.2 Rule 4
// ============================================================================
//
// Kad je klijentkinja u Return from Break protokolu (posle pauze >7 dana),
// blago smanji deficit — sa -20% na -8% (tdee × 0.92).

function applyReturnFromBreakSync(status: UserStatus): UserStatus {
  if (isRuleDisabled(status, 'return_from_break_sync')) return status;
  if (!status.training.isInReturnFromBreak) return status;

  return {
    ...status,
    nutrition: { ...status.nutrition, _returnSyncActive: true },
  };
}

// ============================================================================
// RULE 5 — Hydration First
// Spec 03 Sekcija 3.2 Rule 5
// ============================================================================
//
// Pre menjanja makro plana, sugerisi vodu. Ako recovery < 0.85 i hydration
// < 70%, BLOKIRA druga prilagodjavanja na 24h + emit warning event.

async function applyHydrationFirstSync(status: UserStatus): Promise<UserStatus> {
  if (isRuleDisabled(status, 'hydration_first')) return status;

  const hydrationRate =
    status.nutrition.hydrationTargetMl > 0
      ? status.nutrition.hydrationTodayMl / status.nutrition.hydrationTargetMl
      : 1;

  if (
    status.bio.recoveryMultiplier < RECOVERY_THRESHOLD_HYDRATION &&
    hydrationRate < HYDRATION_PERCENT_THRESHOLD
  ) {
    await EventBus.emit({
      type: 'HYDRATION_FIRST_WARNING',
      clientId: status.clientId,
      message: 'Pre nego što menjamo plan, popij 500ml vode.',
    });

    const blockUntil = new Date(status.lastUpdatedAt.getTime() + HYDRATION_BLOCK_HOURS * 60 * 60 * 1000);
    return { ...status, _blockMacroChangesUntil: blockUntil };
  }

  // Ako uslovi nisu zadovoljeni, ostani prazan (ne brisi prethodni block ako
  // jos uvek vazi — to je responsibility cron-a koji cisti istekle blokade)
  return status;
}

// ============================================================================
// RULE 6 — Metabolic Noise Block
// Spec 03 Sekcija 3.2 Rule 6
// ============================================================================
//
// Ako klijentkinja triger-uje metabolicku buku (tecne kal > 10% budzeta),
// blokiraj plan adjustment na 3 dana.

function applyMetabolicNoiseBlock(status: UserStatus): UserStatus {
  if (isRuleDisabled(status, 'metabolic_noise_block')) return status;
  if (!status.nutrition.isMetabolicNoiseTriggered) return status;

  const blockUntil = new Date(
    status.lastUpdatedAt.getTime() + METABOLIC_NOISE_BLOCK_DAYS * 24 * 60 * 60 * 1000,
  );

  return { ...status, _blockProgressionUntil: blockUntil };
}

// ============================================================================
// RULE 7 — Illness Penalty Sync
// Spec 03 Sekcija 3.2 Rule 7
// ============================================================================
//
// Bolest = -0.15 na recovery multiplier (ovo dodaje training Sloj 4 u
// loadParameters; ovde NE diramo recovery jer je Sync Engine downstream od
// recovery calc). Nutrition: ako je deficit, smanji ga na -5% (ne -20%).

function applyIllnessPenaltySync(status: UserStatus): UserStatus {
  if (isRuleDisabled(status, 'illness_penalty')) return status;
  if (status.training.activePauseEvent?.type !== 'illness') return status;

  // Nista za update u status-u ovde — recalcCalorieTarget chita
  // isInIllnessPause iz training.activePauseEvent.type i tamo aplicira -5%
  return status;
}

// ============================================================================
// RULE 8 — Cycle Menstrual (weight unreliable)
// Spec 03 Sekcija 3.2 Rule 8
// ============================================================================
//
// Tokom menstrualne faze, weight tracking je nepouzdan (zadrzavanje vode).
// Markiraj flag — weekly checkin ce znati da preskoci adaptaciju te nedelje.

function applyCycleMenstrualSync(status: UserStatus): UserStatus {
  if (isRuleDisabled(status, 'cycle_menstrual_ignore')) return status;
  if (status.bio.cyclePhase !== 'menstrual') return status;

  return { ...status, bio: { ...status.bio, weightDataReliable: false } };
}

// ============================================================================
// Helpers
// ============================================================================

function isRuleDisabled(status: UserStatus, rule: SyncRuleName): boolean {
  return status.clientOverrides.includes(rule);
}

function cloneStatus(status: UserStatus): UserStatus {
  // Deep clone kroz JSON roundtrip — sve Date instance postaju ISO string
  // pa ih moramo vratiti nazad. Alternativno: structured clone kad bude
  // dostupan u svim runtime-ima (vec je u Node 17+).
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(status);
  }
  // Fallback za starije Node verzije
  const json = JSON.parse(JSON.stringify(status));
  // Vrati Date polja
  if (typeof json.lastUpdatedAt === 'string') json.lastUpdatedAt = new Date(json.lastUpdatedAt);
  if (typeof json._blockMacroChangesUntil === 'string') json._blockMacroChangesUntil = new Date(json._blockMacroChangesUntil);
  if (typeof json._blockProgressionUntil === 'string') json._blockProgressionUntil = new Date(json._blockProgressionUntil);
  return json;
}

// ============================================================================
// Re-export EventBus radi convenience-a
// ============================================================================

export { EventBus };
