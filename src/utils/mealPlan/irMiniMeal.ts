// ============================================================================
// mealPlan/irMiniMeal — IR mini-meal markers (IT-19)
// Izvučeno iz src/utils/mealPlanGenerator.ts (refaktor split, zero behavior change)
// ============================================================================
//
// Pure helper — vraca novi niz GeneratedMeal sa obelezenim slotovima 2 i 4
// kao mini_meal_ir ako klijentkinja ima insulin_resistance.
//
// Biologija (Spec 02 Sekcija 6.4): IR klijentkinja mora imati "insulin-free
// windows" izmedju main meal-ova, inace insulin hronicno povisen → blokira
// lipolizu. Slotovi 2 i 4 su P+F: nula carbs, kalorije koje bi otisle na
// carbs prebacuju se na fat za sitost. Ovim ostaje tacno 5 obroka, total
// kalorija ostaje ista, ali slot 2 i 4 postaju mini P+F.

import type { MetabolicCondition } from "@/types/training";
import {
  CARBS_KCAL_PER_G,
  FAT_KCAL_PER_G,
  IR_MINI_MEAL_MIN_SLOT_COUNT,
} from "@/constants/nutritionConstants";
import type { GeneratedMeal, MealSlotConfig } from "./types";

export function applyIRMiniMealMarkers(
  meals: GeneratedMeal[],
  metabolicConditions: MetabolicCondition[],
  slotConfigs: MealSlotConfig[],
): GeneratedMeal[] {
  if (!metabolicConditions.includes('insulin_resistance')) return meals;
  if (meals.length < IR_MINI_MEAL_MIN_SLOT_COUNT) return meals;

  return meals.map((meal, index) => {
    const slotConfig = slotConfigs[index];
    // Mini-meal samo za morning_snack (slot 2) i afternoon_snack (slot 4)
    const isMiniSlot =
      slotConfig?.templateType === 'morning_snack' ||
      slotConfig?.templateType === 'afternoon_snack';
    if (!isMiniSlot) return { ...meal, slotType: 'standard' as const };

    // Prebaci carbs kcal → fat (4 kcal/g carbs → 9 kcal/g fat).
    // Total kcal ostaje konstantan, carbs = 0.
    const carbKcal = meal.carbs * CARBS_KCAL_PER_G;
    const fatKcalBoost = Math.round(carbKcal / FAT_KCAL_PER_G);

    return {
      ...meal,
      slotType: 'mini_meal_ir' as const,
      slotLabel: 'Mini-obrok (P+F)',
      carbs: 0,
      fat: meal.fat + fatKcalBoost,
    };
  });
}
