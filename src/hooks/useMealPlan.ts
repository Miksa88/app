// ============================================================================
// useMealPlan — manages 7-day meal plan + pantry state
// ============================================================================
//
// Persistencija (Faza A1): localStorage. Migracija u Supabase tabelu u IT-29.
// ============================================================================

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStatus } from "@/hooks/useUserStatus";
import { generateMealPlan, type MealPlanWeek, type MealPlanSlot } from "@/utils/nutrition/mealPlanGenerator";
import { supabase } from "@/integrations/supabase/client";
import { safeStorage } from "@/lib/safeStorage";

const STORAGE_KEY_PLAN = "fbi:meal_plan";
const STORAGE_KEY_PANTRY = "fbi:pantry_keys";

function getMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;  // ako je nedelja, idi 6 unazad; inače 1-day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function loadPlanFromStorage(weekStartDate: string): MealPlanWeek | null {
  try {
    const raw = safeStorage.getItem(`${STORAGE_KEY_PLAN}:${weekStartDate}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MealPlanWeek;
    return parsed;
  } catch {
    return null;
  }
}

function savePlanToStorage(plan: MealPlanWeek): void {
  try {
    safeStorage.setItem(`${STORAGE_KEY_PLAN}:${plan.weekStartDate}`, JSON.stringify(plan));
  } catch {
    // localStorage full or unavailable — ignore (UI ostaje u memoriji)
  }
}

function loadPantryFromStorage(): Set<string> {
  try {
    const raw = safeStorage.getItem(STORAGE_KEY_PANTRY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function savePantryToStorage(keys: Set<string>): void {
  try {
    safeStorage.setItem(STORAGE_KEY_PANTRY, JSON.stringify(Array.from(keys)));
  } catch {
    // ignore
  }
}

export interface UseMealPlanResult {
  plan: MealPlanWeek | null;
  isLoading: boolean;
  pantryKeys: Set<string>;
  /** Generiše novi plan za ovu nedelju (overwrites postojeći) */
  regenerate: () => Promise<void>;
  /** Ažurira jedan slot — confirm / swap / pending */
  updateSlot: (slotIdx: number, updates: Partial<MealPlanSlot>) => void;
  /** Toggle ingredient u pantry-ju */
  togglePantry: (key: string) => void;
  /** Confirm sve slot-ove odjednom */
  confirmAll: () => void;
}

export function useMealPlan(): UseMealPlanResult {
  const { clientId } = useAuth();
  const { status } = useUserStatus(clientId);
  const [plan, setPlan] = useState<MealPlanWeek | null>(null);
  const [pantryKeys, setPantryKeys] = useState<Set<string>>(() => loadPantryFromStorage());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const weekStart = getMonday();

  // Initial load
  useEffect(() => {
    const stored = loadPlanFromStorage(weekStart);
    if (stored) {
      setPlan(stored);
      setIsLoading(false);
      return;
    }
    // Auto-generate ako nema sačuvanog
    if (clientId && status) {
      void regenerate();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, status, weekStart]);

  const regenerate = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    if (!status) {
      setIsLoading(false);
      return;
    }
    // Pull allergies + foodDislikes iz profila
    let allergies: string[] = [];
    let foodDislikes: string[] = [];
    if (clientId) {
      const { data } = await supabase
        .from("profiles")
        .select("allergies, food_dislikes")
        .eq("id", clientId)
        .maybeSingle();
      if (data) {
        allergies = data.allergies ?? [];
        foodDislikes = data.food_dislikes ?? [];
      }
    }

    const dailyTarget = {
      calories: status.nutrition.currentCalorieTarget,
      protein: status.nutrition.macros.proteinG,
      carbs: status.nutrition.macros.carbsG,
      fat: status.nutrition.macros.fatG,
    };
    // mealCount: 5 ako je >2200 kcal, 4 ako je >1600 kcal, inace 3
    const mealCount = dailyTarget.calories > 2200 ? 5 : dailyTarget.calories > 1600 ? 4 : 3;

    const newPlan = generateMealPlan({
      dailyTarget,
      mealCount,
      allergies,
      foodDislikes,
      weekStartDate: weekStart,
    });

    setPlan(newPlan);
    savePlanToStorage(newPlan);
    setIsLoading(false);
  }, [clientId, status, weekStart]);

  const updateSlot = useCallback((slotIdx: number, updates: Partial<MealPlanSlot>): void => {
    setPlan(prev => {
      if (!prev) return prev;
      const newSlots = prev.slots.map((s, i) => (i === slotIdx ? { ...s, ...updates } : s));
      const next = { ...prev, slots: newSlots };
      savePlanToStorage(next);
      return next;
    });
  }, []);

  const togglePantry = useCallback((key: string): void => {
    setPantryKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      savePantryToStorage(next);
      return next;
    });
  }, []);

  const confirmAll = useCallback((): void => {
    setPlan(prev => {
      if (!prev) return prev;
      const newSlots = prev.slots.map(s => ({ ...s, status: "confirmed" as const }));
      const next = { ...prev, slots: newSlots };
      savePlanToStorage(next);
      return next;
    });
  }, []);

  return { plan, isLoading, pantryKeys, regenerate, updateSlot, togglePantry, confirmAll };
}
