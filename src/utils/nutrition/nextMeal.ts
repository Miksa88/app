// ============================================================================
// nextMeal — izbor "Sledeći obrok" kartice na Home-u iz MealPlanWeek.slots
// ============================================================================
//
// Bugfix (strict refactor): Home.tsx je čitao `mealPlan.meals` koji ne postoji
// posle refaktora na `slots` strukturu — kartica je uvek bila prazna. Ova
// čista funkcija bira prvi nepojedeni slot današnjeg dana (vremenski sledeći,
// po slotIndex-u) i razrešava foodId u FoodItem za prikaz imena/makroa.
//
// "Pojedenost" se izvodi iz broja logovanih obroka danas (dailyTotals
// .mealsLogged) — isti signal koji je Home koristio i pre refaktora.
// ============================================================================

import { FOOD_DATABASE, type FoodItem } from "@/data/foodDatabase";
import type { MealPlanSlot, MealPlanWeek } from "@/utils/nutrition/mealPlanGenerator";

export interface NextMealSelection {
  /** Sledeći nepojedeni slot današnjeg dana — null ako nema plana / sve pojedeno */
  slot: MealPlanSlot | null;
  /** Razrešen FoodItem za slot.foodId — null ako nije pronađen */
  food: FoodItem | null;
  /** Broj slotova u današnjem danu (za "x / y obroka" copy) */
  todaySlotCount: number;
  /** true kad današnji dan postoji u planu i svi obroci su logovani */
  allLogged: boolean;
}

const EMPTY: NextMealSelection = { slot: null, food: null, todaySlotCount: 0, allLogged: false };

/** 0 = ponedeljak … 6 = nedelja (poklapa MealPlanSlot.dayIndex) */
export function mondayBasedDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function selectNextMeal(
  plan: MealPlanWeek | null | undefined,
  mealsLogged: number,
  now: Date = new Date(),
): NextMealSelection {
  if (!plan || !Array.isArray(plan.slots) || plan.slots.length === 0) return EMPTY;

  const dayIndex = mondayBasedDayIndex(now);
  const todaySlots = plan.slots
    .filter((s) => s.dayIndex === dayIndex)
    .sort((a, b) => a.slotIndex - b.slotIndex);

  if (todaySlots.length === 0) return EMPTY;

  const logged = Math.max(0, Math.floor(mealsLogged));
  if (logged >= todaySlots.length) {
    return { slot: null, food: null, todaySlotCount: todaySlots.length, allLogged: true };
  }

  const slot = todaySlots[logged];
  const food = FOOD_DATABASE.find((f) => f.id === slot.foodId) ?? null;
  return { slot, food, todaySlotCount: todaySlots.length, allLogged: false };
}
