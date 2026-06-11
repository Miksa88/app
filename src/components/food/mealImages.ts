// ============================================================================
// mealImages — fallback mapa za slike obroka lokalno dostupne u assets/meals
// ============================================================================
//
// Izvučeno iz Food.tsx (refactor 1.7) da bi Food.tsx i MealSearchModal delili
// istu logiku bez react-refresh upozorenja (samo komponente u .tsx exportima).
// ============================================================================

import type { GeneratedMeal } from "@/utils/mealPlanGenerator";
import type { FoodItem } from "@/data/foodDatabase";

import greekYogurt from "@/assets/meals/greek-yogurt.jpg";
import chickenSalad from "@/assets/meals/chicken-salad.jpg";
import salmonBroccoli from "@/assets/meals/salmon-broccoli.jpg";
import overnightOats from "@/assets/meals/overnight-oats.jpg";
import proteinSmoothie from "@/assets/meals/protein-smoothie.jpg";
import proteinBar from "@/assets/meals/protein-bar.jpg";

export const MEAL_IMAGES: Record<string, string> = {
  "greek-yogurt.jpg": greekYogurt,
  "chicken-salad.jpg": chickenSalad,
  "salmon-broccoli.jpg": salmonBroccoli,
  "overnight-oats.jpg": overnightOats,
  "protein-smoothie.jpg": proteinSmoothie,
  "protein-bar.jpg": proteinBar,
};

/**
 * Slika za obrok: prvo DB imageUrl iz pool-a, pa heuristički fallback po imenu.
 */
export function getMealImage(meal: GeneratedMeal, foodPool: FoodItem[]): string | null {
  const dbFood = foodPool.find(f => f.id === meal.mealId);
  if (dbFood?.imageUrl && MEAL_IMAGES[dbFood.imageUrl]) return MEAL_IMAGES[dbFood.imageUrl];
  // Fallback mapping po slotu/imenu
  const name = meal.name.toLowerCase();
  if (name.includes("yogurt") || name.includes("jogurt")) return greekYogurt;
  if (name.includes("chicken") || name.includes("piletina") || name.includes("salad")) return chickenSalad;
  if (name.includes("salmon") || name.includes("losos") || name.includes("fish")) return salmonBroccoli;
  if (name.includes("oat") || name.includes("ovsene")) return overnightOats;
  if (name.includes("smoothie") || name.includes("shake")) return proteinSmoothie;
  if (name.includes("bar") || name.includes("snack")) return proteinBar;
  return null;
}
