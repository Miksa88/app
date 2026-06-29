// ============================================================================
// mealMacros.ts — validacija custom makro unosa (ExtraMealSheet / off-plan log)
// ============================================================================
// meal_logs kolone calories/protein/carbs/fat_actual su numeric BEZ CHECK >= 0.
// Off-plan unos radi Number(str) (prazno→0, "-50"→-50), pa bez ovog guarda
// negativni/apsurdni makroi tiho persistuju i kvare dnevne zbirove (reduceri
// sabiraju protein_actual). Guard se koristi u canSave (submit je disabled).
// ============================================================================

export const MEAL_MACRO_MAX = {
  calories: 10000, // kcal po jednom obroku — realan gornji plafon
  grams: 1000, // g po makrou
} as const;

/** Kalorije moraju biti pozitivan konačan broj unutar plafona. */
export function isValidMealCalories(input: string): boolean {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 && n <= MEAL_MACRO_MAX.calories;
}

/** Makro u gramima: prazno je dozvoljeno (→0); inače konačan broj 0..MAX. */
export function isValidMacroGrams(input: string): boolean {
  if (input.trim() === "") return true;
  const n = Number(input);
  return Number.isFinite(n) && n >= 0 && n <= MEAL_MACRO_MAX.grams;
}
