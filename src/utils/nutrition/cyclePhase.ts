// ============================================================================
// cyclePhase — menstrualni ciklus → faza + modifikatori
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 2.2 (Hormonal_Aware_Mode)
//       + 01_TRAINING_FLOW_MASTER.md Sekcija 5 Korak 5 (volume modifier tabela)
// ============================================================================
//
// 4-fazni model za nutrition sync rules (Sync Rule 1 — luteal carb bonus,
// Sync Rule 8 — menstrual weight unreliable). Training koristi finiju 6-fazu
// podelu iz Sekcije 5 spec-a 01 (early/late follicular, early/late luteal)
// — ako budem trebao, dodati 6-phase helper kasnije.
// ============================================================================

import type { NutritionCyclePhase } from '@/types/nutrition';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ============================================================================
// calcCycleDay — koliko je dana proslo od poslednje menstruacije
// ============================================================================
//
// Vraca 1-based broj. Ako je poslednja menstruacija duza od 35 dana — vraca
// null (klijentkinja je verovatno preskocila ciklus, ne mozemo da imamo
// pouzdan racun).

export function calcCycleDay(lastPeriodStart: Date, today: Date): number | null {
  const diffMs = today.getTime() - lastPeriodStart.getTime();
  const day = Math.floor(diffMs / MS_PER_DAY) + 1;

  if (day < 1) return null;       // datum poslednjeg perioda u buducnosti = bug
  if (day > 35) return null;      // van prosecnog raspona — re-entry treba

  return day;
}

// ============================================================================
// getCyclePhase — 4-fazni model
// Spec 02 Sekcija 2.2
// ============================================================================
//
// Granice:
//   1–5    menstrual
//   6–13   follicular
//   14     ovulation (jedan dan)
//   15–28+ luteal
//
// 28-dnevni prosek je referenca. Realni ciklusi variraju 21–35 dana —
// luteal faza se prostire i preko 28 (do 35 ako klijentkinja prima "late
// period" sutra). Ako je dan > 28, jos uvek smatramo luteal — ako je > 35,
// calcCycleDay vraca null pa ovo i ne dolazi.

export function getCyclePhase(cycleDay: number): NutritionCyclePhase {
  if (cycleDay <= 5) return 'menstrual';
  if (cycleDay <= 13) return 'follicular';
  if (cycleDay === 14) return 'ovulation';
  return 'luteal';
}

// ============================================================================
// getModifiersForPhase — koje sync modifikatore aktivira data faza
// ============================================================================
//
// Vraca string-listu human-readable modifier ID-eva. Sync Engine ih cita za
// `appliedModifiers` array u UserStatus.nutrition (audit trail za UI banner).

export function getModifiersForPhase(phase: NutritionCyclePhase): string[] {
  switch (phase) {
    case 'menstrual':
      return ['weight_data_unreliable'];
    case 'follicular':
      return [];
    case 'ovulation':
      return [];
    case 'luteal':
      return ['luteal_phase_carb_bonus'];
  }
}

// ============================================================================
// isCyclePhaseActive — convenience za sync rules
// ============================================================================

export function isCyclePhaseActive(
  phase: NutritionCyclePhase | null,
  target: NutritionCyclePhase,
): boolean {
  return phase === target;
}
