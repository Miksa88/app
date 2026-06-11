// ============================================================================
// mealPlan/similarMeals — auto-swap kandidati po macro sličnosti
// Izvučeno iz src/utils/mealPlanGenerator.ts (refaktor split, zero behavior change)
// ============================================================================
//
// Za dato jelo (currentMealId), vrati N alternativa iz availableFoods koji
// pogađaju isti slot, ±tolerance% kalorija/proteina, prošli alergi/metab.
// Filter — caller je vec primenio antiIngredientFilter na availableFoods.

import { FoodItem } from "@/data/foodDatabase";
import { SIMILAR_MEAL_TOLERANCE, SIMILAR_MEAL_TOP_N } from "@/constants/nutritionConstants";

export interface FindSimilarOptions {
  /** ±tolerance fraction (0.10 = ±10%). Default 0.10. */
  tolerance?: number;
  /** Max kandidata vraceno. Default 5. */
  topN?: number;
}

export function findSimilarMeals(
  currentMeal: { mealId: string; calories: number; protein: number; slot: string },
  availableFoods: FoodItem[],
  options: FindSimilarOptions = {},
): FoodItem[] {
  const { tolerance = SIMILAR_MEAL_TOLERANCE, topN = SIMILAR_MEAL_TOP_N } = options;
  const targetCal = currentMeal.calories;
  const targetProtein = Math.max(1, currentMeal.protein);

  const candidates = availableFoods.filter(f => {
    if (f.id === currentMeal.mealId) return false;
    if (!f.mealSlots.includes(currentMeal.slot as never)) return false;
    const calDelta = Math.abs(f.calories - targetCal) / Math.max(1, targetCal);
    const protDelta = Math.abs(f.protein - targetProtein) / targetProtein;
    return calDelta <= tolerance && protDelta <= tolerance;
  });

  // Sortiraj po blizini (manja delta = bolji match)
  return candidates
    .map(f => ({
      food: f,
      score:
        Math.abs(f.calories - targetCal) +
        Math.abs(f.protein - targetProtein) * 2,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, topN)
    .map(x => x.food);
}
