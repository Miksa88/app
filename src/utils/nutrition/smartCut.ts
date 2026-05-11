// ============================================================================
// smartCut — Hijerarhija deficit-a (pocetnici.md §3.8 + SREDNJE_NAPREDNE_V2 §3.9)
// ============================================================================
//
// Smart Cut je STAGED deficit umesto flat -20%. Kad se vaga ne kreće a snaga
// stoji, algoritam smanjuje unos po koracima, ne odjednom.
//
// BEGINNER hijerarhija (3 koraka):
//   Step 1: -10% IZ MASTI    (floor 0.6 g/kg)
//   Step 2: -10% IZ OFF-WINDOW CARBS   (Obrok 1 i 5)
//   Step 3: -10% IZ PERI-WORKOUT CARBS (Obrok 3 i 4) — POSLEDNJA LINIJA
//
// INTERMEDIATE hijerarhija (4 koraka, fat floor 0.7):
//   Step 1: -10% IZ MASTI    (floor 0.7 g/kg)
//   Step 2: -10% IZ OFF-WINDOW CARBS   (Obrok 1 i 5)
//   Step 3: -10% IZ MID-MEAL CARBS     (Obrok 2 — sredinski obroci)
//   Step 4: -10% IZ PERI-WORKOUT CARBS (Obrok 3 i 4) — POSLEDNJA LINIJA
//
// HARD GATE: ako klijentkinja ne ostvaruje >10,000 koraka dnevno, Smart Cut
// je BLOKIRAN.
//
// Logički dijagram (§3.9):
//   IF (vaga raste >0.5% & snaga stoji) → advance step
//   IF (vaga stoji & snaga raste)        → MAINTAIN
//   IF (vaga pada & snaga pada)          → Emergency Refeed (videti §5.1)
//   IF (vaga pada & snaga raste)         → IDEALNO, drži
//
// Pure funkcije, bez side-efekata. Sync Engine i check-in handler ih kompozuju.
// ============================================================================

export const SMART_CUT_KCAL_REDUCTION_PCT = 0.10;
export const NEAT_DAILY_GATE = 10000;
export const FAT_GRAM_FLOOR_PER_KG = 0.6;
export const FAT_GRAM_FLOOR_PER_KG_INTERMEDIATE = 0.7;  // SREDNJE_NAPREDNE_V2 §3.3
export const CARB_OFF_WINDOW_FLOOR_PER_KG = 1.5;
export const CARB_MID_MEAL_FLOOR_PER_KG = 1.2;          // intermediate Step 3
export const CARB_PERI_WORKOUT_FLOOR_PER_KG = 1.0;

import type { ExperienceLevel } from '@/types/training';

export type SmartCutStep = 0 | 1 | 2 | 3 | 4;

export interface MacroBreakdown {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface SmartCutInput {
  macros: MacroBreakdown;
  totalCalories: number;
  weightKg: number;
  step: SmartCutStep;
  experienceLevel?: ExperienceLevel;     // default 'beginner'
}

export interface SmartCutResult {
  macros: MacroBreakdown;
  totalCalories: number;
  appliedStep: SmartCutStep;
  reductionKcal: number;
  notes: string[];
}

// ============================================================================
// applySmartCut — primenjuje step-down na makroe
// ============================================================================
//
// KUMULATIVNO: step=2 znači da je već primenjen step 1 (fats) + step 2 (off-
// window carbs). Iznos kalorijskog rezanja je `step × 10%` ukupnog target-a.
//
// Floor-ovi:
//   - fats:           ≥ 0.6 g/kg telesne mase
//   - off-window carbs: ≥ 1.5 g/kg
//   - peri-workout carbs: ≥ 1.0 g/kg (apsolutni floor pre nego što se hrana
//                          drasticno reže — žrtvujemo trening pre toga)

export function applySmartCut(input: SmartCutInput): SmartCutResult {
  if (input.step === 0) {
    return {
      macros: input.macros,
      totalCalories: input.totalCalories,
      appliedStep: 0,
      reductionKcal: 0,
      notes: ['Smart Cut nije aktivan (Step 0 — maintenance baseline).'],
    };
  }

  const isIntermediate = input.experienceLevel === 'intermediate';
  const stepReductionKcal = input.totalCalories * SMART_CUT_KCAL_REDUCTION_PCT;
  const { proteinG } = input.macros;
  let { carbsG, fatG } = input.macros;
  let totalReductionKcal = 0;
  const notes: string[] = [];

  // Step 1 — masti (najmanji termički efekat, ne utiče na trening)
  if (input.step >= 1) {
    const fatFloorPerKg = isIntermediate
      ? FAT_GRAM_FLOOR_PER_KG_INTERMEDIATE
      : FAT_GRAM_FLOOR_PER_KG;
    const fatFloorG = input.weightKg * fatFloorPerKg;
    const requestedFatReductionG = stepReductionKcal / 9;
    const newFatG = Math.max(fatG - requestedFatReductionG, fatFloorG);
    const actualReductionG = fatG - newFatG;
    fatG = newFatG;
    totalReductionKcal += actualReductionG * 9;
    notes.push(
      `Step 1: -${Math.round(actualReductionG)}g masti (floor ${Math.round(fatFloorG)}g zaštićen).`,
    );
  }

  // Step 2 — off-window carbs (Obrok 1 i 5; ne dira peri-workout glikogen)
  if (input.step >= 2) {
    const carbFloorG = input.weightKg * CARB_OFF_WINDOW_FLOOR_PER_KG;
    const requestedCarbReductionG = stepReductionKcal / 4;
    const newCarbG = Math.max(carbsG - requestedCarbReductionG, carbFloorG);
    const actualReductionG = carbsG - newCarbG;
    carbsG = newCarbG;
    totalReductionKcal += actualReductionG * 4;
    notes.push(
      `Step 2: -${Math.round(actualReductionG)}g off-window carbs (Obrok 1 i 5).`,
    );
  }

  // Step 3 — INTERMEDIATE: mid-meal carbs (Obrok 2). BEGINNER: peri-workout.
  if (input.step >= 3) {
    if (isIntermediate) {
      const carbFloorG = input.weightKg * CARB_MID_MEAL_FLOOR_PER_KG;
      const requestedCarbReductionG = stepReductionKcal / 4;
      const newCarbG = Math.max(carbsG - requestedCarbReductionG, carbFloorG);
      const actualReductionG = carbsG - newCarbG;
      carbsG = newCarbG;
      totalReductionKcal += actualReductionG * 4;
      notes.push(
        `Step 3: -${Math.round(actualReductionG)}g mid-meal carbs (Obrok 2 — sredinski).`,
      );
    } else {
      // Beginner: Step 3 je već peri-workout (poslednja linija)
      const carbFloorG = input.weightKg * CARB_PERI_WORKOUT_FLOOR_PER_KG;
      const requestedCarbReductionG = stepReductionKcal / 4;
      const newCarbG = Math.max(carbsG - requestedCarbReductionG, carbFloorG);
      const actualReductionG = carbsG - newCarbG;
      carbsG = newCarbG;
      totalReductionKcal += actualReductionG * 4;
      notes.push(
        `Step 3: -${Math.round(actualReductionG)}g peri-workout carbs (POSLEDNJA LINIJA — Obrok 3 i 4).`,
      );
    }
  }

  // Step 4 — INTERMEDIATE only: peri-workout carbs (POSLEDNJA LINIJA)
  if (input.step >= 4 && isIntermediate) {
    const carbFloorG = input.weightKg * CARB_PERI_WORKOUT_FLOOR_PER_KG;
    const requestedCarbReductionG = stepReductionKcal / 4;
    const newCarbG = Math.max(carbsG - requestedCarbReductionG, carbFloorG);
    const actualReductionG = carbsG - newCarbG;
    carbsG = newCarbG;
    totalReductionKcal += actualReductionG * 4;
    notes.push(
      `Step 4: -${Math.round(actualReductionG)}g peri-workout carbs (POSLEDNJA LINIJA — Obrok 3 i 4).`,
    );
  }

  const newTotalCalories = Math.round(input.totalCalories - totalReductionKcal);

  return {
    macros: { proteinG, carbsG, fatG },
    totalCalories: newTotalCalories,
    appliedStep: input.step,
    reductionKcal: Math.round(totalReductionKcal),
    notes,
  };
}

// ============================================================================
// isSmartCutBlocked — NEAT 10k gate (pocetnici.md §3.8)
// ============================================================================

export function isSmartCutBlocked(neatDailyAvg: number): boolean {
  return neatDailyAvg < NEAT_DAILY_GATE;
}

// ============================================================================
// decideSmartCutAction — nedeljna evaluacija (pocetnici.md §3.9)
// ============================================================================

export interface SmartCutDecisionInput {
  weightChangePctLast7Days: number;     // npr. 0.6 = +0.6%, -0.4 = pad
  strengthTrend: 'rising' | 'stable' | 'falling';
  currentStep: SmartCutStep;
  neatDailyAvg: number;
  experienceLevel?: ExperienceLevel;     // default 'beginner'
}

export type SmartCutAction =
  | { action: 'advance'; nextStep: SmartCutStep; reason: string }
  | { action: 'maintain'; reason: string }
  | { action: 'blocked'; reason: string }
  | { action: 'emergency_refeed'; reason: string };

export function decideSmartCutAction(input: SmartCutDecisionInput): SmartCutAction {
  // HARD GATE: NEAT 10k pre bilo kakvog cut-a
  if (isSmartCutBlocked(input.neatDailyAvg)) {
    return {
      action: 'blocked',
      reason: `NEAT prosek ${Math.round(input.neatDailyAvg)} < ${NEAT_DAILY_GATE} koraka. ` +
              `Smart Cut BLOKIRAN — prvo podigni NEAT, ne smanjuj hranu.`,
    };
  }

  // Emergency Refeed: vaga PADA & snaga PADA (T3 ili glikogen kolaps)
  if (input.weightChangePctLast7Days < -0.3 && input.strengthTrend === 'falling') {
    return {
      action: 'emergency_refeed',
      reason: 'Vaga pada + snaga pada → metabolicki signal. Trigger Emergency Refeed (§5.1).',
    };
  }

  // Idealno: vaga pada & snaga raste — drži plan
  if (input.weightChangePctLast7Days < 0 && input.strengthTrend === 'rising') {
    return {
      action: 'maintain',
      reason: 'IDEALNO: vaga pada, snaga raste. Plan radi savršeno — ne diraj.',
    };
  }

  // Rekompozicija: vaga stoji & snaga raste — drži (mišić zamenjuje mast)
  if (Math.abs(input.weightChangePctLast7Days) < 0.5 && input.strengthTrend === 'rising') {
    return {
      action: 'maintain',
      reason: 'Rekompozicija u toku (vaga stoji, snaga raste). NE DIRAJ NIŠTA.',
    };
  }

  // Stagnacija/dobitak: vaga raste >0.5% & snaga ne raste — advance step
  if (input.weightChangePctLast7Days > 0.5 && input.strengthTrend !== 'rising') {
    const isIntermediate = input.experienceLevel === 'intermediate';
    const maxStep = isIntermediate ? 4 : 3;
    if (input.currentStep < maxStep) {
      const next = (input.currentStep + 1) as SmartCutStep;
      const stepName = isIntermediate
        ? (next === 1 ? 'Step 1 (-10% masti)' :
           next === 2 ? 'Step 2 (-10% off-window carbs)' :
           next === 3 ? 'Step 3 (-10% mid-meal carbs)' :
           'Step 4 (-10% peri-workout carbs — POSLEDNJA LINIJA)')
        : (next === 1 ? 'Step 1 (-10% masti)' :
           next === 2 ? 'Step 2 (-10% off-window carbs)' :
           'Step 3 (-10% peri-workout carbs — POSLEDNJA LINIJA)');
      return {
        action: 'advance',
        nextStep: next,
        reason: `Vaga +${input.weightChangePctLast7Days.toFixed(1)}%, snaga ne napreduje. ` +
                `Advance ka ${stepName}.`,
      };
    }
    return {
      action: 'maintain',
      reason: `Već na Step ${maxStep} (poslednja linija). Razmotri Diet Break (2 nedelje maintenance) umesto daljeg rezanja.`,
    };
  }

  return {
    action: 'maintain',
    reason: 'Trenutni plan stabilan. Nastavi nedelju, evaluiraj ponovo.',
  };
}
