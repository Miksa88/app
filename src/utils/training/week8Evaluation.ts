// ============================================================================
// week8Evaluation — Tranzicija u novi mezociklus (pocetnici.md §6)
// ============================================================================
//
// Posle završetka deload nedelje (W7), algoritam radi 3 evaluacije:
//
//   Pitanje 1: Kako je snaga rasla?
//     +15% ili više → +10% kcal (veći mišić = veći BMR), drži plan
//     +5 do 15%     → standardni nastavak (W5 težine = baseline novog mezo)
//     0% ili pad    → +10% kcal (Reverse), plan se NE menja (mogući deficit/stres)
//
//   Pitanje 2: Kako je ciklus reagovao?
//     Regularan, nepromenjen        → zeleno svetlo
//     Dužina menjana ±2-3 dana      → žuto: bez Overreach faze sledeći mezo
//     Izostao ili pomeren > 1 ned   → CRVENO: blokira novi mezo, +10% kcal 2 ned, volumen -30%
//
//   Pitanje 3: Mentalni status?
//     Motivisana            → standardni nastavak
//     Dosada bez burnout-a  → variraj vežbe, ne menjaj ravan kretanja
//     Burnout               → Diet Break 2 ned + volumen -50% + razgovor
//
// Pure funkcija. Service `runWeek8Evaluation` (TBD) je orkestrira.
// ============================================================================

export type CycleStatus = 'regular' | 'shifted_minor' | 'shifted_major';
export type MentalStatus = 'motivated' | 'bored' | 'burnout';

export interface Week8EvaluationInput {
  strengthChangePctOverMesocycle: number;   // npr. 12 = +12%
  cycleStatus: CycleStatus;
  mentalStatus: MentalStatus;
  hasHashimoto?: boolean;                   // §1.1 cap
}

export interface Week8EvaluationResult {
  // Adjustments
  calorieAdjustmentPct: number;     // npr. 0.10 = +10%, -0.10 = -10%
  volumeAdjustmentPct: number;      // negativni = smanjenje (-0.5 = -50%)
  allowOverreachNextMesocycle: boolean;
  blockNewMesocycle: boolean;       // CRVENO svetlo
  dietBreakWeeks: number;           // 0 = nema, 2 = 2-nedeljni break
  resetPravilo7Dana: boolean;       // true ako je snaga > 15% i kalorije se podižu

  // UI / trener
  greenLight: boolean;              // overall: smemo u novi mezo bez intervencije?
  decisions: string[];              // jedna stavka po pitanju, za trener prikaz
  recommendations: string[];        // actionable lista
}

// ============================================================================
// evaluateWeek8 — 3 pitanja sa pravilima iz §6.1
// ============================================================================

export function evaluateWeek8(input: Week8EvaluationInput): Week8EvaluationResult {
  const decisions: string[] = [];
  const recommendations: string[] = [];

  // ── Pitanje 1: Snaga ──────────────────────────────────────────────────
  let calorieAdj = 0;
  let resetPravilo = false;
  if (input.strengthChangePctOverMesocycle >= 15) {
    calorieAdj = 0.10;
    resetPravilo = true;
    decisions.push(`Snaga: +${input.strengthChangePctOverMesocycle.toFixed(0)}% — telo zahteva više goriva, +10% kcal.`);
    recommendations.push('Reset Pravilo 7 dana sa +10% početnog unosa (veći mišić = veći BMR).');
  } else if (input.strengthChangePctOverMesocycle >= 5) {
    decisions.push(`Snaga: +${input.strengthChangePctOverMesocycle.toFixed(0)}% — standardni nastavak. W5 težine postaju baseline novog mezo.`);
  } else {
    calorieAdj = 0.10;
    decisions.push(`Snaga: ${input.strengthChangePctOverMesocycle.toFixed(0)}% — mogući deficit ili stres. Reverse: +10% kcal, plan se ne menja.`);
    recommendations.push('Reverse approach: +10% kcal, nastavi isti plan.');
  }

  // ── Pitanje 2: Ciklus ─────────────────────────────────────────────────
  let allowOverreach = true;
  let blockMesocycle = false;
  let cycleVolumeAdj = 0;
  if (input.cycleStatus === 'shifted_minor') {
    allowOverreach = false;
    decisions.push('Ciklus: ±2-3 dana pomeranja → žuto svetlo. Sledeći mezo bez Overreach faze.');
  } else if (input.cycleStatus === 'shifted_major') {
    blockMesocycle = true;
    allowOverreach = false;
    cycleVolumeAdj = -0.30;
    calorieAdj = Math.max(calorieAdj, 0.10);  // override pitanje 1 ako je manje
    decisions.push('Ciklus: izostao ili pomeren >1 nedelje → CRVENO. Blokira novi mezo. +10% kcal 2 nedelje, volumen -30%.');
    recommendations.push('Blokiraj ulazak u novi mezo dok se ciklus ne stabilizuje.');
    recommendations.push('Dva nedelje +10% kcal i volumen -30%.');
  } else {
    decisions.push('Ciklus: regularan i nepromenjen → zeleno svetlo.');
  }

  // ── Pitanje 3: Mentalni status ────────────────────────────────────────
  let dietBreakWeeks = 0;
  let mentalVolumeAdj = 0;
  if (input.mentalStatus === 'bored') {
    decisions.push('Dosada bez burnout-a → variraj vežbe (ne menjaj ravan kretanja).');
    recommendations.push('Predloži Goblet Squat → Leg Press, RDL Bucice → 45° Hyperextension.');
  } else if (input.mentalStatus === 'burnout') {
    dietBreakWeeks = 2;
    mentalVolumeAdj = -0.50;
    blockMesocycle = true;
    decisions.push('Burnout/odbojnost → 2-nedeljni Diet Break + volumen -50% + razgovor.');
    recommendations.push('Maintenance kalorije 2 nedelje (Diet Break).');
    recommendations.push('Smanji volumen treninga 50% i razmotri uzrok burnout-a.');
  } else {
    decisions.push('Mentalno motivisana → standardni nastavak.');
  }

  // ── Hashimoto Overreach blok (§1.1) ──────────────────────────────────
  if (input.hasHashimoto) {
    allowOverreach = false;
    decisions.push('Hashimoto: Overreach uvek blokiran (cap RPE 8) — pocetnici.md §1.1.');
  }

  // ── Volumen adjustment: minimum (najveće smanjenje) ──────────────────
  const volumeAdj = Math.min(cycleVolumeAdj, mentalVolumeAdj);

  const greenLight =
    !blockMesocycle &&
    input.mentalStatus !== 'burnout' &&
    input.cycleStatus !== 'shifted_major';

  return {
    calorieAdjustmentPct: calorieAdj,
    volumeAdjustmentPct: volumeAdj,
    allowOverreachNextMesocycle: allowOverreach,
    blockNewMesocycle: blockMesocycle,
    dietBreakWeeks,
    resetPravilo7Dana: resetPravilo,
    greenLight,
    decisions,
    recommendations,
  };
}
