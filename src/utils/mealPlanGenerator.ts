// ============================================================================
// mealPlanGenerator — public entry point (re-export fasada)
// ============================================================================
//
// Implementacija je podeljena u kohezivne module pod src/utils/mealPlan/:
//   - types.ts            — interfejsi (ClientProfile, NutritionTemplate, ...)
//   - mealMatching.ts     — scoring/izbor hrane za slot + synergy detekcija
//   - planAssembly.ts     — generateMealPlan + generateMealPlanWeek (glavni algoritam)
//   - templateMatching.ts — findMatchingTemplates + MEAL_PRESETS
//   - similarMeals.ts     — findSimilarMeals (auto-swap kandidati)
//
// Ovaj fajl zadržava identičan javni API kao pre split-a — consumer importi
// (`@/utils/mealPlanGenerator`) rade bez izmena. Zero behavior change.

export type {
  ClientProfile,
  NutritionTemplate,
  TemplateMealSlot,
  PlanInsight,
  GeneratedMealPlan,
  GeneratedMeal,
} from "./mealPlan/types";

export {
  generateMealPlan,
  generateMealPlanWeek,
  type MealPlanWeek,
} from "./mealPlan/planAssembly";

export {
  findMatchingTemplates,
  DEFAULT_5_MEAL_SLOTS,
  MEAL_PRESETS,
} from "./mealPlan/templateMatching";

export {
  findSimilarMeals,
  type FindSimilarOptions,
} from "./mealPlan/similarMeals";
