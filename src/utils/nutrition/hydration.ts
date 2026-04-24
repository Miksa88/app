// ============================================================================
// hydration — pure helper za izracun dnevnog hydration target-a (IT-14)
// Spec: 02_NUTRITION_FLOW_MASTER.md §8.1 (Hydration baseline + training bonus)
// ============================================================================
//
// Formula:
//   base = round(weightKg * 35)  ml
//   + 500 ml ako je trening dan (Sync Rule 5 dependency)
//   clamp na [1500, 4000] ml (safety pojas)
//
// Primeri:
//   - 70 kg, non-training  → 2450 ml
//   - 70 kg, training      → 2950 ml
//   - 40 kg, non-training  → 1500 ml (underweight safety floor)
//   - 90 kg, training      → 3650 ml
//
// Clamp-ovi:
//   - MIN 1500 ml — ispod ovog je underhydration rizik (spec 02 §8.1)
//   - MAX 4000 ml — preko ovog hyponatremia rizik, ne forsiramo
// ============================================================================

/** Minimum dnevne hidracije — underhydration safety. */
export const HYDRATION_MIN_ML = 1500;

/** Maksimum dnevne hidracije — hyponatremia safety. */
export const HYDRATION_MAX_ML = 4000;

/** Bonus za trening dan (spec 02 §8.1). */
export const HYDRATION_TRAINING_BONUS_ML = 500;

/** ml per kg telesne mase — baseline multiplier. */
export const HYDRATION_ML_PER_KG = 35;

/**
 * Izracunava dnevni hydration target u ml.
 *
 * @param weightKg telesna masa u kg (ne sme biti negativna)
 * @param isTrainingDay true ako klijentkinja ima zakazanu ili zavrsenu sesiju danas
 * @returns integer ml, clamp-ovano na [1500, 4000]
 */
export function calcHydrationTarget(
  weightKg: number,
  isTrainingDay: boolean,
): number {
  const base = Math.round(weightKg * HYDRATION_ML_PER_KG);
  const withBonus = isTrainingDay ? base + HYDRATION_TRAINING_BONUS_ML : base;
  return Math.max(HYDRATION_MIN_ML, Math.min(HYDRATION_MAX_ML, withBonus));
}
