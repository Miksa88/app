// ============================================================================
// useLogMeal / useSkipMeal / useReplaceMeal — mutation hooks za meal logging
// Spec: 02_NUTRITION_FLOW_MASTER.md §13 (Daily logging),
//       §5.5 (Sync Rule 6 — Metabolic Noise);
//       03_INTEGRATION_LAYER.md §3.1 (MealLog flow), §3.2 Rule 6
// ============================================================================
//
// Orchestration (slično `useDailyCheckIn` IT-5 pattern-u):
//
//   1. POST na Edge Function `process-meal-log` (IT-11) — insert meal_logs +
//      liquid 24h aggregate + set `isMetabolicNoiseTriggered` + increment
//      `redFlags.skipCount7d` ako status='skipped'. EF vraća novi UserStatus
//      (bez sync rule evaluation-a — to je klijent-side posao).
//   2. Call `runSyncRules(newStatus)` — god node orkestrator koji na osnovu
//      `isMetabolicNoiseTriggered=true` flagha postavlja
//      `_blockProgressionUntil = now + 3d` (Rule 6). Drugi rule-ovi se takođe
//      rekompjutuju (idempotentno).
//   3. POST na `save-user-status` sa sync-derived statusom (drugi upsert, ovaj
//      put sa ispravno setovanim `_blockProgressionUntil`).
//   4. Invalidate `['userStatus', clientId]` React Query cache.
//   5. Toast success.
//
// Tri hooka (useLogMeal, useSkipMeal, useReplaceMeal) dele isti Edge Function
// i isti orchestrator (`runLogMeal`) — razlikuju se samo u input shape-u. Thin
// wrapperi mapiraju varijantu na `MealLogPayload` (status='logged' / 'skipped'
// / 'replaced').
//
// Error handling:
// - Ako EF failuje → throw; useMutation.error state + toast.error.
// - Ako runSyncRules throw-a (ne očekujemo — pure funkcija) → throw.
// - Ako save-user-status failuje → throw; meal_logs je već insert-ovan na
//   strani EF-a. Sync Engine je idempotentan pa retry hook-a (sledeći obrok
//   ili drugi check-in) će rekompjutovati `_blockProgressionUntil` iz trenutnog
//   state-a (`isMetabolicNoiseTriggered` ostaje `true` dok se 3-dan prozor ne
//   potroši, pa naredni runSyncRules opet postavlja blok).
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { runSyncRules } from "@/utils/sync/syncEngine";
import { _deserializeStatus } from "@/utils/db/userStatus";

import type { UserStatus } from "@/types/userStatus";

// ============================================================================
// Types
// ============================================================================

export type MealLogStatus = "logged" | "skipped" | "replaced";

/**
 * Payload koji EF `process-meal-log` očekuje (IT-11).
 */
export interface MealLogPayload {
  clientId: string;
  mealId: string;
  slotIndex: number;
  status: MealLogStatus;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  wasLiquidCalories?: boolean;
  replacementMealId?: string | null;
}

/**
 * Response iz EF-a `process-meal-log` (IT-11 shape).
 */
export interface ProcessMealLogResponse {
  ok: true;
  status: unknown; // opaque — deserijalizujemo u UserStatus na hook strani
  liquidTotal: number;
  isMetabolicNoiseTriggered: boolean;
}

/**
 * Input za tri tanka wrapper-a (logged/skipped/replaced).
 */
export interface LogMealInput {
  clientId: string;
  mealId: string;
  slotIndex: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  wasLiquidCalories?: boolean;
}

export interface SkipMealInput {
  clientId: string;
  mealId: string;
  slotIndex: number;
}

export interface ReplaceMealInput {
  clientId: string;
  mealId: string;
  slotIndex: number;
  replacementMealId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  wasLiquidCalories?: boolean;
}

/**
 * Dependency injection interface za testiranje (bez QueryClientProvider-a).
 * Omotava sve side-effect pozive: EF invoke, runSyncRules, save-user-status.
 */
export interface LogMealDeps {
  invokeProcessMealLog: (
    payload: MealLogPayload,
  ) => Promise<ProcessMealLogResponse>;
  invokeSaveUserStatus: (status: UserStatus) => Promise<void>;
  applyRules: (status: UserStatus) => Promise<UserStatus>;
}

// ============================================================================
// Pure orchestrator — testable bez React konteksta
// ============================================================================

/**
 * Centralna orchestracija IT-12 flow-a. Razdvojeno od useMutation wrappera
 * radi lakšeg testiranja (bez QueryClientProvider-a u vitest-u).
 *
 * Koraci 1–3 iz file-level komentara. Vraća finalni, sync-derived UserStatus.
 */
export async function runLogMeal(
  payload: MealLogPayload,
  deps: LogMealDeps,
): Promise<UserStatus> {
  // 1. POST na EF process-meal-log — insert + aggregate + set flags
  const efResponse = await deps.invokeProcessMealLog(payload);

  // 2. Deserijalizuj UserStatus iz EF response-a (Date polja su ISO string-ovi
  //    u JSONB-u). Reuse shared helper iz userStatus.ts da bi deserialize bio
  //    konzistentan sa loadUserStatus.
  const newStatus = _deserializeStatus(efResponse.status);

  // 3. Run client-side syncRules — Rule 6 (metabolic noise block) ulazi kad je
  //    `isMetabolicNoiseTriggered=true` i postavlja `_blockProgressionUntil`.
  //    Idempotentno: ako flag nije true, runSyncRules ne menja bloking polja.
  const synced = await deps.applyRules(newStatus);

  // 4. Perzistuj finalni (sync-derived) status kroz save-user-status EF
  await deps.invokeSaveUserStatus(synced);

  return synced;
}

// ============================================================================
// Production deps — realni Supabase pozivi
// ============================================================================

function defaultDeps(): LogMealDeps {
  return {
    invokeProcessMealLog: async (payload) => {
      const { data, error } = await supabase.functions.invoke(
        "process-meal-log",
        {
          body: {
            clientId: payload.clientId,
            mealId: payload.mealId,
            slotIndex: payload.slotIndex,
            status: payload.status,
            calories: payload.calories,
            protein: payload.protein,
            carbs: payload.carbs,
            fat: payload.fat,
            wasLiquidCalories: payload.wasLiquidCalories ?? false,
            replacementMealId: payload.replacementMealId ?? null,
          },
        },
      );
      if (error) {
        throw new Error(
          `process-meal-log failed: ${error.message ?? String(error)}`,
        );
      }
      const payloadData = data as ProcessMealLogResponse | { ok?: false; error?: string } | null;
      if (!payloadData || !("ok" in payloadData) || !payloadData.ok) {
        const msg =
          (payloadData && "error" in payloadData && payloadData.error) ||
          "process-meal-log returned invalid response";
        throw new Error(String(msg));
      }
      return payloadData as ProcessMealLogResponse;
    },

    invokeSaveUserStatus: async (status) => {
      const { error } = await supabase.functions.invoke("save-user-status", {
        body: { status },
      });
      if (error) {
        throw new Error(
          `save-user-status failed: ${error.message ?? String(error)}`,
        );
      }
    },

    applyRules: runSyncRules,
  };
}

// ============================================================================
// React Query hooks — tanki wrapper-i oko runLogMeal
// ============================================================================

export interface UseLogMealOptions {
  /** Dependency override za testove. */
  deps?: LogMealDeps;
  /** Skip toast (za nested scenarije). */
  silent?: boolean;
  /** i18n translator (injected — izbegavamo direktnu zavisnost na LanguageContext). */
  t?: (key: string) => string;
}

function defaultTranslator(key: string): string {
  // Fallback copy — en preferira zero-guilt phrasing kad t() nije injektovan
  const fallback: Record<string, string> = {
    "food.mealLogged": "Meal logged",
    "food.mealSkipped": "Meal skipped",
    "food.mealReplaced": "Meal replaced",
    "food.mealLogError": "Meal not saved",
  };
  return fallback[key] ?? key;
}

/**
 * Hook za log-ovanje pojednog obroka (status='logged').
 */
export function useLogMeal(options: UseLogMealOptions = {}) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();
  const t = options.t ?? defaultTranslator;

  return useMutation<UserStatus, Error, LogMealInput>({
    mutationFn: (input) =>
      runLogMeal(
        {
          clientId: input.clientId,
          mealId: input.mealId,
          slotIndex: input.slotIndex,
          status: "logged",
          calories: input.calories,
          protein: input.protein,
          carbs: input.carbs,
          fat: input.fat,
          wasLiquidCalories: input.wasLiquidCalories ?? false,
          replacementMealId: null,
        },
        deps,
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["userStatus", vars.clientId] });
      if (!options.silent) {
        toast.success(t("food.mealLogged"));
      }
    },
    onError: (err) => {
      if (!options.silent) {
        toast.error(t("food.mealLogError"), { description: err.message });
      }
    },
  });
}

/**
 * Hook za skip obroka (status='skipped', macros=0).
 */
export function useSkipMeal(options: UseLogMealOptions = {}) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();
  const t = options.t ?? defaultTranslator;

  return useMutation<UserStatus, Error, SkipMealInput>({
    mutationFn: (input) =>
      runLogMeal(
        {
          clientId: input.clientId,
          mealId: input.mealId,
          slotIndex: input.slotIndex,
          status: "skipped",
          // Mirror DB CHECK constraint: skipped → svi makro brojevi = 0
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          wasLiquidCalories: false,
          replacementMealId: null,
        },
        deps,
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["userStatus", vars.clientId] });
      if (!options.silent) {
        // Skipped meal — zero-guilt (pocetnici.md §5.2). Bez kompenzacije.
        toast.success("Bez brige.", {
          description: "Sledeći obrok je opet po planu. Bez kompenzacije.",
        });
      }
    },
    onError: (err) => {
      if (!options.silent) {
        toast.error(t("food.mealLogError"), { description: err.message });
      }
    },
  });
}

/**
 * Hook za zamenu obroka (status='replaced', replacementMealId obavezan).
 */
export function useReplaceMeal(options: UseLogMealOptions = {}) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();
  const t = options.t ?? defaultTranslator;

  return useMutation<UserStatus, Error, ReplaceMealInput>({
    mutationFn: (input) =>
      runLogMeal(
        {
          clientId: input.clientId,
          mealId: input.mealId,
          slotIndex: input.slotIndex,
          status: "replaced",
          calories: input.calories,
          protein: input.protein,
          carbs: input.carbs,
          fat: input.fat,
          wasLiquidCalories: input.wasLiquidCalories ?? false,
          replacementMealId: input.replacementMealId,
        },
        deps,
      ),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["userStatus", vars.clientId] });
      if (!options.silent) {
        // Mental Reset (pocetnici.md §5.2) — zero-guilt poruka kad klijent
        // zameni plan obrok. NE kažnjavamo, NE preporučujemo kompenzaciju.
        toast.success("Sve je u redu.", {
          description:
            "Sledeći obrok je opet po planu. Jedan dan ne menja ništa — 30 dana menja sve.",
        });
      }
    },
    onError: (err) => {
      if (!options.silent) {
        toast.error(t("food.mealLogError"), { description: err.message });
      }
    },
  });
}
