// ============================================================================
// useLogWaterGlass — mutation hook za +1 čaša vode
// Spec: 02_NUTRITION_FLOW_MASTER.md §8.1 (Hydration);
//       03_INTEGRATION_LAYER.md §6.5 (water_logs append-only)
// ============================================================================
//
// Orchestration:
//
//   1. INSERT u `water_logs` direktno (klijentski Supabase client — RLS
//      dozvoljava vlasniku INSERT/SELECT/DELETE; UPDATE nije policy-d pattern,
//      append-only). Default glass size: 250 ml.
//   2. Load UserStatus (postojeći `loadUserStatus` helper).
//   3. Patch `nutrition.hydrationTodayMl += 250` (optimistic rollup; pravi
//      daily rollup iz `water_logs` je posao cron-a ili view-a — u alpha fazi
//      vodimo denormalizovan signal u status-u radi UI-a).
//   4. POST na `save-user-status` sa patched status-om.
//   5. Invalidate `['userStatus', clientId]` React Query cache.
//
// Za razliku od `useLogMeal`, ovde NE zovemo `runSyncRules` — Rule 5 (Hydration
// First) se evaluira u runSyncRules kroz `hydrationTodayMl / hydrationTargetMl`
// ratio i može da blokira macro changes ako je recovery < 0.85 + hydration < 70%.
// Dodavanje vode smanjuje verovatnoću triggeranja, ne obrnuto; pa skipujemo
// ciklus i ostavljamo sledećem pozivaocu (daily check-in, meal log) da pokrene
// runSyncRules.
//
// Zašto klijent-side INSERT umesto EF-a:
// - `water_logs` nema sync rule orkestraciju po insertu (akumulacija je dnevni
//   broj, ne event koji okida pravilo).
// - RLS dozvoljava vlasniku INSERT direktno (IT-2 migracija).
// - Edge Function bi bio redundantan HTTP hop za thin append operaciju.
//
// NAPOMENA: `save-user-status` i dalje ide kroz EF jer `user_status` tabela ima
// service_role-only write policy (Princip 1 iz spec-a 03 — jedan writer po
// podatku).
// ============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { loadUserStatus } from "@/utils/db/userStatus";

import type { UserStatus } from "@/types/userStatus";

// ============================================================================
// Konstante
// ============================================================================

/** Default veličina jedne čaše (spec 02 §8.1 — 250ml za alpha). */
export const DEFAULT_GLASS_ML = 250;

// ============================================================================
// Types
// ============================================================================

export interface LogWaterGlassInput {
  clientId: string;
  /** Količina u ml, default 250. Može se prosledjivati za custom čašu. */
  mlAdded?: number;
}

/**
 * DI interface — omotava supabase.insert + save-user-status + loadUserStatus.
 */
export interface LogWaterGlassDeps {
  insertWaterLog: (row: {
    user_id: string;
    logged_at: string;
    ml_added: number;
  }) => Promise<{ error: { code?: string; message?: string } | null }>;
  loadStatus: (clientId: string) => Promise<UserStatus | null>;
  invokeSaveUserStatus: (status: UserStatus) => Promise<void>;
}

// ============================================================================
// Pure orchestrator — testable bez React konteksta
// ============================================================================

/**
 * Centralna orkestracija IT-12 water flow-a. Koraci 1–4 iz file komentara.
 */
export async function runLogWaterGlass(
  input: LogWaterGlassInput,
  deps: LogWaterGlassDeps,
): Promise<UserStatus> {
  const mlAdded = input.mlAdded ?? DEFAULT_GLASS_ML;

  // 1. INSERT u water_logs (klijentska strana, RLS vlasnik INSERT)
  const { error: insertErr } = await deps.insertWaterLog({
    user_id: input.clientId,
    logged_at: new Date().toISOString(),
    ml_added: mlAdded,
  });
  if (insertErr) {
    throw new Error(
      `water_logs insert failed: ${insertErr.code ?? ""} ${insertErr.message ?? ""}`.trim(),
    );
  }

  // 2. Load UserStatus (da bismo imali trenutni hydrationTodayMl baseline)
  const currentStatus = await deps.loadStatus(input.clientId);
  if (!currentStatus) {
    throw new Error(
      `useLogWaterGlass: UserStatus ne postoji za clientId=${input.clientId}. ` +
        `Pozovi initUserStatus prvo.`,
    );
  }

  // 3. Patch hydrationTodayMl (optimistic rollup). Čista immutable izmena.
  const patched: UserStatus = {
    ...currentStatus,
    nutrition: {
      ...currentStatus.nutrition,
      hydrationTodayMl: (currentStatus.nutrition.hydrationTodayMl ?? 0) + mlAdded,
    },
  };

  // 4. Perzistuj kroz save-user-status EF
  await deps.invokeSaveUserStatus(patched);

  return patched;
}

// ============================================================================
// Production deps — realni Supabase pozivi
// ============================================================================

function defaultDeps(): LogWaterGlassDeps {
  return {
    insertWaterLog: async (row) => {
      const { error } = await supabase.from("water_logs").insert(row);
      return { error };
    },
    loadStatus: loadUserStatus,
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
  };
}

// ============================================================================
// React Query hook
// ============================================================================

export interface UseLogWaterGlassOptions {
  deps?: LogWaterGlassDeps;
  silent?: boolean;
  t?: (key: string) => string;
}

function defaultTranslator(key: string): string {
  const fallback: Record<string, string> = {
    "food.waterLogged": "+1 glass",
    "food.waterLogError": "Water not saved",
  };
  return fallback[key] ?? key;
}

export function useLogWaterGlass(options: UseLogWaterGlassOptions = {}) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();
  const t = options.t ?? defaultTranslator;

  return useMutation<UserStatus, Error, LogWaterGlassInput>({
    mutationFn: (input) => runLogWaterGlass(input, deps),

    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["userStatus", vars.clientId] });
      if (!options.silent) {
        toast.success(t("food.waterLogged"));
      }
    },

    onError: (err) => {
      if (!options.silent) {
        toast.error(t("food.waterLogError"), { description: err.message });
      }
    },
  });
}
