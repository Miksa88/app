// ============================================================================
// useWeeklyCheckIn — mutation hook za nedeljni check-in (IT-17)
// Spec: 02_NUTRITION_FLOW_MASTER.md §10 (Weekly + trendline)
//       RALPH_PLAN.md IT-17
// ============================================================================
//
// Klijent-side wrapper oko `process-weekly-check-in` Edge Function-a.
// Server:
//   1. Insert u weekly_check_ins (UNIQUE user+week → 409)
//   2. Compute weeklyWeightDelta iz poslednja 2 weekly reda
//   3. Load UserStatus, run trendline adaptation
//   4. Patch bio.weeklyWeightDelta, nutrition.currentCalorieTarget (ako action != status_quo),
//      redFlags.daysSinceLastWeeklyCheckIn=0, nutrition.daysSincePlanChange=0
//   5. Upsert user_status → Realtime push osvežava useUserStatus
//
// Pattern: isti kao useDailyCheckIn / useStartPause (DI za testove).
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

export interface WeeklyCheckInInput {
  clientId: string;
  /** YYYY-MM-DD — ponedeljak nedelje. */
  weekStartDate: string;
  weightAvgKg: number;
  waistCm?: number | null;
  hipCm?: number | null;
  thighCm?: number | null;
  /** 1–10 */
  energyAvg: number;
  /** 1–5 */
  identityScore: number;
  notes?: string | null;
}

export interface WeeklyCheckInResponse {
  ok: true;
  weeklyRow: unknown;
  status: unknown;
  trendline: {
    newCalorieTarget: number;
    action: string;
    reason: string;
  };
  weeklyWeightDelta: number | null;
}

export interface WeeklyCheckInDeps {
  invoke: (
    body: Omit<WeeklyCheckInInput, 'clientId'> & { clientId: string },
  ) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

function defaultDeps(): WeeklyCheckInDeps {
  return {
    invoke: (body) =>
      supabase.functions.invoke('process-weekly-check-in', { body }),
  };
}

/**
 * Pure orkestrator — razdvojeno od useMutation wrappera za lakse testiranje.
 */
export async function runWeeklyCheckIn(
  input: WeeklyCheckInInput,
  deps: WeeklyCheckInDeps,
): Promise<WeeklyCheckInResponse> {
  const { data, error } = await deps.invoke(input);

  if (error) {
    throw new Error(
      `process-weekly-check-in failed: ${error.message ?? String(error)}`,
    );
  }

  const payload = data as
    | WeeklyCheckInResponse
    | { ok?: false; error?: string }
    | null;

  if (!payload || !('ok' in payload) || !payload.ok) {
    const msg =
      (payload && 'error' in payload && payload.error) ||
      'process-weekly-check-in returned invalid response';
    throw new Error(String(msg));
  }

  return payload as WeeklyCheckInResponse;
}

export interface UseWeeklyCheckInOptions {
  silent?: boolean;
  deps?: WeeklyCheckInDeps;
}

export function useWeeklyCheckIn(
  clientId: string | null,
  options: UseWeeklyCheckInOptions = {},
) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();

  return useMutation<
    WeeklyCheckInResponse,
    Error,
    Omit<WeeklyCheckInInput, 'clientId'>
  >({
    mutationFn: (input) => {
      if (!clientId) {
        throw new Error('useWeeklyCheckIn: clientId is null');
      }
      return runWeeklyCheckIn({ clientId, ...input }, deps);
    },

    onSuccess: () => {
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['userStatus', clientId] });
      }
    },

    onError: (err) => {
      if (!options.silent) {
        toast.error(err.message || 'Nedeljni check-in nije sačuvan.');
      }
    },
  });
}
