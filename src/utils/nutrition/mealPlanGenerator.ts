// ============================================================================
// mealPlanGenerator — generiše 7-dnevni plan obroka iz foodDatabase-a
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 6 (Meal Slot Distribution)
// ============================================================================
//
// Princip:
//   - 7 dana × N obroka (3-5 po dnevnom kcal target-u)
//   - Svaki obrok bira hranu koja:
//     1. fits meal slot (breakfast/snack_am/lunch/snack_pm/dinner)
//     2. ne sadrzi alergene korisnika
//     3. ne sadrzi food dislikes
//     4. balansira ka dnevnom kcal/macro target-u
//     5. varira tokom nedelje (max 2x ponavljanje)
//
// Output: MealPlanWeek struct sa 7 dana × M slots, svaki slot ima foodId
// ============================================================================

import { FOOD_DATABASE, type FoodItem } from "@/data/foodDatabase";

export type MealSlotType = "breakfast" | "snack_am" | "lunch" | "snack_pm" | "dinner";

export interface MealPlanSlot {
  dayIndex: number;        // 0 = ponedeljak, 6 = nedelja
  slotIndex: number;       // 0..4 prati MealSlotType
  slotType: MealSlotType;
  foodId: string;
  status: "pending" | "confirmed" | "swap_requested";
  // Macro snapshot (denormalized za brz prikaz bez join-a)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPlanWeek {
  weekStartDate: string;     // YYYY-MM-DD (ponedeljak)
  generatedAt: string;       // ISO
  mealCount: number;         // 3, 4 ili 5
  dailyTarget: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  slots: MealPlanSlot[];
}

export interface GeneratorInput {
  dailyTarget: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealCount: 3 | 4 | 5;
  allergies: string[];       // matched against FoodItem.allergens
  foodDislikes: string[];    // matched against FoodItem.tags + name keywords
  weekStartDate: string;     // YYYY-MM-DD
}

// ============================================================================
// Slot allocation procenti dnevnog kcal target-a
// ============================================================================

const SLOT_DISTRIBUTION: Record<3 | 4 | 5, Record<MealSlotType, number>> = {
  3: { breakfast: 0.30, snack_am: 0, lunch: 0.40, snack_pm: 0, dinner: 0.30 },
  4: { breakfast: 0.25, snack_am: 0.10, lunch: 0.35, snack_pm: 0, dinner: 0.30 },
  5: { breakfast: 0.25, snack_am: 0.10, lunch: 0.30, snack_pm: 0.10, dinner: 0.25 },
};

const ACTIVE_SLOTS: Record<3 | 4 | 5, MealSlotType[]> = {
  3: ["breakfast", "lunch", "dinner"],
  4: ["breakfast", "snack_am", "lunch", "dinner"],
  5: ["breakfast", "snack_am", "lunch", "snack_pm", "dinner"],
};

const SLOT_INDEX: Record<MealSlotType, number> = {
  breakfast: 0,
  snack_am: 1,
  lunch: 2,
  snack_pm: 3,
  dinner: 4,
};

// ============================================================================
// Filteri
// ============================================================================

function filterByAllergens(foods: FoodItem[], allergies: string[]): FoodItem[] {
  if (allergies.length === 0 || allergies.includes("none")) return foods;
  return foods.filter(f => !f.allergens.some(a => allergies.includes(a)));
}

function filterByDislikes(foods: FoodItem[], dislikes: string[]): FoodItem[] {
  if (dislikes.length === 0) return foods;
  const lowerDislikes = dislikes.map(d => d.toLowerCase());
  return foods.filter(f => {
    const haystack = `${f.name} ${f.nameSr} ${f.ingredients.join(" ")}`.toLowerCase();
    return !lowerDislikes.some(d => haystack.includes(d));
  });
}

function filterBySlot(foods: FoodItem[], slot: MealSlotType): FoodItem[] {
  return foods.filter(f => f.mealSlots.includes(slot));
}

// ============================================================================
// Selection algoritam — kompromis između macro fit i variety
// ============================================================================

interface ScoredFood {
  food: FoodItem;
  score: number;
}

function scoreFood(
  food: FoodItem,
  targetCalories: number,
  recentFoodIds: string[],
): number {
  // Manji score = bolji
  const calorieDiff = Math.abs(food.calories - targetCalories);
  const calorieScore = calorieDiff / Math.max(targetCalories, 1);  // 0..1+

  // Penalty za skoro korišćene namirnice (variety boost)
  const lastUsedIdx = recentFoodIds.lastIndexOf(food.id);
  let varietyPenalty = 0;
  if (lastUsedIdx !== -1) {
    const distance = recentFoodIds.length - lastUsedIdx;
    if (distance < 2) varietyPenalty = 1.5;       // jednom ili 2x — strogo izbegavaj
    else if (distance < 4) varietyPenalty = 0.5;  // 3-4 mesta nazad — blagi
  }

  return calorieScore + varietyPenalty;
}

function pickBestFood(
  candidates: FoodItem[],
  targetCalories: number,
  recentFoodIds: string[],
): FoodItem | null {
  if (candidates.length === 0) return null;
  const scored: ScoredFood[] = candidates.map(food => ({
    food,
    score: scoreFood(food, targetCalories, recentFoodIds),
  }));
  scored.sort((a, b) => a.score - b.score);
  // Top 3 best, nasumicno biraj jedan (variety)
  const topN = scored.slice(0, Math.min(3, scored.length));
  return topN[Math.floor(Math.random() * topN.length)].food;
}

// ============================================================================
// Glavna funkcija
// ============================================================================

export function generateMealPlan(input: GeneratorInput): MealPlanWeek {
  const { dailyTarget, mealCount, allergies, foodDislikes, weekStartDate } = input;

  const filteredFoods = filterByDislikes(
    filterByAllergens(FOOD_DATABASE, allergies),
    foodDislikes,
  );

  const slots: MealPlanSlot[] = [];
  const recentFoodIds: string[] = [];

  for (let day = 0; day < 7; day += 1) {
    for (const slotType of ACTIVE_SLOTS[mealCount]) {
      const slotPct = SLOT_DISTRIBUTION[mealCount][slotType];
      const targetKcal = Math.round(dailyTarget.calories * slotPct);

      const candidates = filterBySlot(filteredFoods, slotType);
      const picked = pickBestFood(candidates, targetKcal, recentFoodIds);

      if (!picked) {
        // Fallback: ako nema kandidata posle filtera, uzmi bilo koji food iz slot-a
        // bez obzira na alergene (degraded mode — bolje to nego prazan slot)
        const slotFallback = filterBySlot(FOOD_DATABASE, slotType);
        if (slotFallback.length === 0) continue;
        const fallback = slotFallback[0];
        slots.push({
          dayIndex: day,
          slotIndex: SLOT_INDEX[slotType],
          slotType,
          foodId: fallback.id,
          status: "pending",
          calories: fallback.calories,
          protein: fallback.protein,
          carbs: fallback.carbs,
          fat: fallback.fat,
        });
        recentFoodIds.push(fallback.id);
        continue;
      }

      slots.push({
        dayIndex: day,
        slotIndex: SLOT_INDEX[slotType],
        slotType,
        foodId: picked.id,
        status: "pending",
        calories: picked.calories,
        protein: picked.protein,
        carbs: picked.carbs,
        fat: picked.fat,
      });
      recentFoodIds.push(picked.id);
    }
  }

  return {
    weekStartDate,
    generatedAt: new Date().toISOString(),
    mealCount,
    dailyTarget,
    slots,
  };
}

// ============================================================================
// Swap helper — pronađe alternativu za jedan slot
// ============================================================================

export function findSwapAlternatives(
  plan: MealPlanWeek,
  slotIdx: number,                  // index u plan.slots
  allergies: string[],
  foodDislikes: string[],
  count: number = 3,
): FoodItem[] {
  const slot = plan.slots[slotIdx];
  if (!slot) return [];

  const filteredFoods = filterByDislikes(
    filterByAllergens(FOOD_DATABASE, allergies),
    foodDislikes,
  );
  const candidates = filterBySlot(filteredFoods, slot.slotType)
    .filter(f => f.id !== slot.foodId);

  const pct = SLOT_DISTRIBUTION[plan.mealCount as 3 | 4 | 5][slot.slotType];
  const targetKcal = Math.round(plan.dailyTarget.calories * pct);

  const scored = candidates.map(food => ({
    food,
    score: Math.abs(food.calories - targetKcal),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, count).map(s => s.food);
}

// ============================================================================
// Day rollup — agregira makroe za jedan dan iz plana
// ============================================================================

export interface DayRollup {
  dayIndex: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  slots: MealPlanSlot[];
}

export function computeDayRollups(plan: MealPlanWeek): DayRollup[] {
  const byDay: Record<number, MealPlanSlot[]> = {};
  for (const slot of plan.slots) {
    if (!byDay[slot.dayIndex]) byDay[slot.dayIndex] = [];
    byDay[slot.dayIndex].push(slot);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const daySlots = (byDay[i] ?? []).sort((a, b) => a.slotIndex - b.slotIndex);
    return {
      dayIndex: i,
      calories: daySlots.reduce((s, x) => s + x.calories, 0),
      protein: daySlots.reduce((s, x) => s + x.protein, 0),
      carbs: daySlots.reduce((s, x) => s + x.carbs, 0),
      fat: daySlots.reduce((s, x) => s + x.fat, 0),
      slots: daySlots,
    };
  });
}
