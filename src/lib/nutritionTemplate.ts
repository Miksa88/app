// ============================================================================
// nutritionTemplate.ts — save-gate validacija za NutritionTemplateEditor
// ============================================================================
// Polja se pišu u nutrition_templates JSONB (macro_ratio, calorie_range,
// meal_slots, modifikatori) — BEZ DB CHECK-a. Editor je nasleđivao name-only
// gate iz useEditor, pa su nevalidne vrednosti (macro/meal sum ≠ 100, 0/negativne
// kalorije, apsurdni modifikatori) tiho persistovale i hranile klijentski diet
// engine. UI je već prikazivao ≠100 upozorenja ali ih nije enforce-ovao.
// ============================================================================

export const NUTRITION_CALORIE_BOUNDS = { min: 800, max: 6000 } as const; // kcal/dan
export const NUTRITION_MODIFIER_ABS_MAX = 1000; // ± kcal modifikator

export interface NutritionTemplateDraft {
  macros: { protein: number; carbs: number; fat: number };
  mealSlots: { caloriePercentage: number }[];
  calorieStrategy: "auto" | "fixed" | "range";
  fixedCalories: number;
  calorieRange: { min: number; max: number };
  differentOnTrainingDays: boolean;
  trainingDayMod: number;
  restDayMod: number;
}

const inRange = (n: number, lo: number, hi: number): boolean =>
  Number.isFinite(n) && n >= lo && n <= hi;

/** True ako je template bezbedan za upis (svi invariante zadovoljeni). */
export function isNutritionTemplateValid(d: NutritionTemplateDraft): boolean {
  const { min, max } = NUTRITION_CALORIE_BOUNDS;

  const macroSum = d.macros.protein + d.macros.carbs + d.macros.fat;
  if (macroSum !== 100) return false;

  const mealSum = d.mealSlots.reduce((s, m) => s + m.caloriePercentage, 0);
  if (mealSum !== 100) return false;

  if (d.calorieStrategy === "fixed" && !inRange(d.fixedCalories, min, max)) return false;
  if (d.calorieStrategy === "range") {
    if (!inRange(d.calorieRange.min, min, max)) return false;
    if (!inRange(d.calorieRange.max, min, max)) return false;
    if (d.calorieRange.min >= d.calorieRange.max) return false;
  }

  if (d.differentOnTrainingDays) {
    const m = NUTRITION_MODIFIER_ABS_MAX;
    if (!inRange(d.trainingDayMod, -m, m)) return false;
    if (!inRange(d.restDayMod, -m, m)) return false;
  }

  return true;
}
