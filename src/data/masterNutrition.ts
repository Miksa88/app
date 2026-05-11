// ============================================================================
// masterNutrition — 2 default nutrition template-a iz master spec-a
// ============================================================================
//
// Aligned sa master training programima:
//   - Beginner Foundation:        balanced 30/40/30, auto kcal, 5 obroka
//   - Intermediate Performance:   high protein 35/40/25, auto + training day +200
//
// Goal: client onboarding profil odlučuje (cilj = cut/bulk/maintain), algoritam
// kombinuje sa template-om: BMR × activity × goal_modifier × template_modifier.
// ============================================================================

import type { NutritionTemplate } from "@/utils/mealPlanGenerator";
import { DEFAULT_5_MEAL_SLOTS } from "@/utils/mealPlanGenerator";

export const MASTER_NUTRITION: NutritionTemplate[] = [
  {
    id: "master-beginner-foundation",
    name: "Beginner Foundation",
    description: "Balansirana ishrana za početnice. Auto kcal po onboarding profilu, 5 obroka, jednake porcije bez obzira na trening.",
    goalType: "health",
    macroRatio: { protein: 30, carbs: 40, fat: 30 },
    macroPreset: "balanced",
    calorieStrategy: "auto",
    differentOnTrainingDays: false,
    restrictions: [],
    tags: ["beginner", "foundation", "default_for_beginner"],
    createdAt: "2026-05-09",
    mealCount: 5,
    mealSlots: [...DEFAULT_5_MEAL_SLOTS],
  },
  {
    id: "master-intermediate-performance",
    name: "Intermediate Performance",
    description: "High protein 35/40/25 za hipertrofiju + kondiciju. Auto kcal, +200 kcal na dan treninga, 5 obroka.",
    goalType: "maintain",
    macroRatio: { protein: 35, carbs: 40, fat: 25 },
    macroPreset: "highProtein",
    calorieStrategy: "auto",
    trainingDayModifier: 200,
    restDayModifier: 0,
    differentOnTrainingDays: true,
    restrictions: [],
    tags: ["intermediate", "performance", "default_for_intermediate"],
    createdAt: "2026-05-09",
    mealCount: 5,
    mealSlots: [...DEFAULT_5_MEAL_SLOTS],
  },
];
