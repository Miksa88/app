// ============================================================================
// setMetrics.ts — clamp za workout set unose (weight / reps)
// ============================================================================
// exercise_progress.weight_kg / reps su plain numeric bez gornje granice, a
// hrane progression algoritam (RPE/volumen). Reducer je ranije radio samo
// Math.max(0, ...) — bez gornjeg plafona i bez NaN guarda (Math.max(0, NaN)
// === NaN). Apsurdne vrednosti (99999) ili NaN su tako curele u upis i kvarile
// progresiju. Ovaj clamp je coerce (ne reject) — UI ne dozvoljava preko plafona.
// ============================================================================

export const SET_METRIC_MAX = {
  weight: 500, // kg — pokriva svaki realan lift
  reps: 100, // ponavljanja po setu
} as const;

export type SetMetricField = keyof typeof SET_METRIC_MAX;

/** Vrati validnu set vrednost: NaN→0, ispod 0→0, iznad plafona→plafon. */
export function clampSetMetric(field: SetMetricField, value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(SET_METRIC_MAX[field], Math.max(0, value));
}
