// ============================================================================
// useMealPlan — manages 7-day meal plan + pantry state
// ============================================================================
//
// Refactor 1.5: React Query kao izvor istine za plan.
//   - useQuery čita plan iz mealPlanStorageService (localStorage, isti ključevi)
//   - useMutation regenerate/updateSlot piše kroz storage service i ažurira keš
//   - Generaciona logika ostaje čista u utils/nutrition/mealPlanGenerator.ts
//
// Persistencija: localStorage (vidi mealPlanStorageService). Migracija u
// Supabase tabelu u IT-29.
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStatus } from "@/hooks/useUserStatus";
import { generateMealPlan, type MealPlanWeek, type MealPlanSlot } from "@/utils/nutrition/mealPlanGenerator";
import { supabase } from "@/integrations/supabase/client";
import * as mealPlanStorage from "@/services/mealPlanStorageService";

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
  const queryClient = useQueryClient();
  const [pantryKeys, setPantryKeys] = useState<Set<string>>(() => mealPlanStorage.loadPantry());

  const weekStart = mealPlanStorage.getMonday();
  const queryKey = ["meal-plan", weekStart] as const;

  // ── Učitavanje plana iz storage-a ──────────────────────────────────────────
  const planQuery = useQuery<MealPlanWeek | null>({
    queryKey,
    queryFn: () => mealPlanStorage.loadPlan(weekStart),
    staleTime: Infinity, // keš je izvor istine; mutacije ga ažuriraju direktno
  });

  // ── Regeneracija plana (generator je čist; side effect = storage write) ───
  const regenerateMutation = useMutation<MealPlanWeek | null>({
    mutationFn: async () => {
      if (!status) return null;

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

      mealPlanStorage.savePlan(newPlan);
      return newPlan;
    },
    onSuccess: (newPlan) => {
      if (newPlan) queryClient.setQueryData(queryKey, newPlan);
    },
  });

  // ── Auto-generate ako nema sačuvanog plana za ovu nedelju ─────────────────
  const shouldAutoGenerate =
    planQuery.isSuccess &&
    planQuery.data === null &&
    !!clientId &&
    !!status &&
    !regenerateMutation.isPending;

  useEffect(() => {
    if (shouldAutoGenerate) regenerateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoGenerate]);

  const regenerate = useCallback(async (): Promise<void> => {
    await regenerateMutation.mutateAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenerateMutation.mutateAsync]);

  // ── Slot mutacije — write-through na storage + query keš ──────────────────
  const mutatePlan = useCallback(
    (transform: (prev: MealPlanWeek) => MealPlanWeek): void => {
      queryClient.setQueryData<MealPlanWeek | null>(queryKey, prev => {
        if (!prev) return prev;
        const next = transform(prev);
        mealPlanStorage.savePlan(next);
        return next;
      });
    },
    // queryKey je stabilan po weekStart-u
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, weekStart],
  );

  const updateSlot = useCallback((slotIdx: number, updates: Partial<MealPlanSlot>): void => {
    mutatePlan(prev => ({
      ...prev,
      slots: prev.slots.map((s, i) => (i === slotIdx ? { ...s, ...updates } : s)),
    }));
  }, [mutatePlan]);

  const confirmAll = useCallback((): void => {
    mutatePlan(prev => ({
      ...prev,
      slots: prev.slots.map(s => ({ ...s, status: "confirmed" as const })),
    }));
  }, [mutatePlan]);

  const togglePantry = useCallback((key: string): void => {
    setPantryKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      mealPlanStorage.savePantry(next);
      return next;
    });
  }, []);

  return {
    plan: planQuery.data ?? null,
    isLoading: planQuery.isLoading || regenerateMutation.isPending,
    pantryKeys,
    regenerate,
    updateSlot,
    togglePantry,
    confirmAll,
  };
}
