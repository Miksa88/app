// ============================================================================
// mealPlanStorageService — localStorage persistencija za 7-dnevni meal plan
// ============================================================================
//
// Izvučeno iz useMealPlan.ts (refactor 1.5). Ključevi i format MORAJU ostati
// identični starim — postojeći sačuvani planovi se čitaju bez migracije:
//   - `fbi:meal_plan:<YYYY-MM-DD>`  → JSON MealPlanWeek
//   - `fbi:pantry_keys`             → JSON string[] (Set serialized kao Array)
//
// Migracija u Supabase tabelu planirana u IT-29.
// ============================================================================

import type { MealPlanWeek } from "@/utils/nutrition/mealPlanGenerator";
import { safeStorage } from "@/lib/safeStorage";

export const STORAGE_KEY_PLAN = "fbi:meal_plan";
export const STORAGE_KEY_PANTRY = "fbi:pantry_keys";

/** Vraća ISO datum (YYYY-MM-DD) ponedeljka za datu nedelju */
export function getMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // ako je nedelja, idi 6 unazad; inače 1-day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

/** Učitava plan za datu nedelju; null ako ne postoji ili je korumpiran */
export function loadPlan(weekStartDate: string): MealPlanWeek | null {
  try {
    const raw = safeStorage.getItem(`${STORAGE_KEY_PLAN}:${weekStartDate}`);
    if (!raw) return null;
    return JSON.parse(raw) as MealPlanWeek;
  } catch {
    return null;
  }
}

/** Snima plan pod ključem njegove nedelje */
export function savePlan(plan: MealPlanWeek): void {
  try {
    safeStorage.setItem(`${STORAGE_KEY_PLAN}:${plan.weekStartDate}`, JSON.stringify(plan));
  } catch {
    // localStorage pun ili nedostupan — ignoriši (UI ostaje u memoriji)
  }
}

/** Učitava pantry ključeve; prazan Set ako ne postoje */
export function loadPantry(): Set<string> {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY_PANTRY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Snima pantry ključeve (Set → JSON Array, isti format kao ranije) */
export function savePantry(keys: Set<string>): void {
  try {
    safeStorage.setItem(STORAGE_KEY_PANTRY, JSON.stringify(Array.from(keys)));
  } catch {
    // ignoriši
  }
}
