// ============================================================================
// mealPlan/mealMatching — scoring i izbor hrane za slot + synergy detekcija
// Izvučeno iz src/utils/mealPlanGenerator.ts (refaktor split, zero behavior change)
// ============================================================================

import { FoodItem } from "@/data/foodDatabase";
import {
  PROTEIN_SHORTFALL_PENALTY,
  CALORIE_DIFF_WEIGHT,
  PROTEIN_DIFF_WEIGHT,
} from "@/constants/nutritionConstants";
import type { GeneratedMeal, MealSlotConfig } from "./types";

// ── SYNERGY DETECTION ──

export function detectSynergies(food: FoodItem): string[] {
  const notes: string[] = [];
  const ingredients = food.ingredients?.map(i => i.toLowerCase()) || [];
  const tags = food.tags || [];

  const hasVitC = ingredients.some(i =>
    i.includes('paprika') || i.includes('pepper') || i.includes('limun') || i.includes('lemon') ||
    i.includes('paradajz') || i.includes('tomato') || i.includes('brokoli') || i.includes('broccoli') ||
    i.includes('narandža') || i.includes('berries')
  );
  const hasIron = ingredients.some(i =>
    i.includes('spanać') || i.includes('spinach') || i.includes('govedina') || i.includes('beef') ||
    i.includes('sočivo') || i.includes('ćuretina') || i.includes('turkey')
  );
  if (hasVitC && hasIron) {
    notes.push('insight.synergyVitCIron');
  }

  const hasFat = ingredients.some(i =>
    i.includes('olive oil') || i.includes('maslinovo') || i.includes('avocado') || i.includes('avokado') ||
    i.includes('nuts') || i.includes('orasi') || i.includes('salmon') || i.includes('losos') ||
    i.includes('almonds') || i.includes('bademi')
  );
  const hasFatSolubleVits = ingredients.some(i =>
    i.includes('šargarepa') || i.includes('carrot') || i.includes('spanać') || i.includes('spinach') ||
    i.includes('brokoli') || i.includes('broccoli') || i.includes('egg') || i.includes('jaj')
  );
  if (hasFat && hasFatSolubleVits) {
    notes.push('insight.synergyFatVitamins');
  }

  if (tags.includes('omega-3')) {
    notes.push('insight.synergyOmega3');
  }

  return notes;
}

// ── MEAL MATCHING ──

export function findTopMatches(
  foods: FoodItem[],
  targetCal: number,
  targetProtein: number,
  minProtein: number,
  topN: number = 3,
): FoodItem[] {
  if (foods.length === 0) return [];

  return foods
    .map(food => {
      const portionMultiplier = food.calories > 0 ? targetCal / food.calories : 1;
      const adjustedProtein = food.protein * portionMultiplier;
      const proteinPenalty = adjustedProtein < minProtein ? PROTEIN_SHORTFALL_PENALTY : 0;
      const calDiff = Math.abs(food.calories - targetCal);
      const proteinDiff = Math.abs(food.protein - targetProtein);
      const score = (calDiff * CALORIE_DIFF_WEIGHT) + (proteinDiff * PROTEIN_DIFF_WEIGHT) + proteinPenalty;
      return { food, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, topN)
    .map(x => x.food);
}

export function findBestMatch(
  foods: FoodItem[],
  targetCal: number,
  targetProtein: number,
  minProtein: number,
): FoodItem | null {
  return findTopMatches(foods, targetCal, targetProtein, minProtein, 1)[0] ?? null;
}

export function createMealFromFood(
  food: FoodItem,
  slotConfig: MealSlotConfig,
  targetCal: number,
  isPostWorkout: boolean
): GeneratedMeal {
  const portionMultiplier = Math.round((food.calories > 0 ? targetCal / food.calories : 1) * 100) / 100;
  return {
    slot: slotConfig.slot as GeneratedMeal['slot'],
    slotLabel: slotConfig.label,
    mealId: food.id,
    name: food.name,
    calories: targetCal,
    protein: Math.round(food.protein * portionMultiplier),
    carbs: Math.round(food.carbs * portionMultiplier),
    fat: Math.round(food.fat * portionMultiplier),
    fiber: Math.round((food.fiber || 0) * portionMultiplier),
    portionMultiplier,
    glycemicIndex: food.glycemicIndex || 'medium',
    isPostWorkout,
    synergyNotes: [],
  };
}
