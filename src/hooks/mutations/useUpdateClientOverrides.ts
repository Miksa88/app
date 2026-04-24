// ============================================================================
// useUpdateClientOverrides — mutation hook za trener override-a sync rule-ova
// Spec: 03_INTEGRATION_LAYER.md §3.2 (clientOverrides gate) + IT-18
// ============================================================================
//
// Trener moze da iskljuci konkretna sync rule-a za 1-na-1 klijentkinju.
// Klijent-side wrapper oko `update-client-overrides` Edge Function-a.
// Server:
//   1. Role guard (profiles.role='trainer')
//   2. Patch UserStatus.clientOverrides (disabled=add / active=remove)
//   3. Upsert user_status + vraca novi UserStatus
//
// Pattern: isti kao useStartPause / useWeeklyCheckIn — pure orchestrator
// odvojen od useMutation wrappera radi lakseg testiranja.
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import type { SyncRuleName, UserStatus } from '@/types/userStatus';

export type OverrideState = 'active' | 'disabled';

export interface UpdateClientOverridesInput {
  clientId: string;
  overrides: Partial<Record<SyncRuleName, OverrideState>>;
}

export interface UpdateClientOverridesResponse {
  ok: true;
  status: UserStatus;
}

export interface UpdateClientOverridesDeps {
  invoke: (body: {
    clientId: string;
    overrides: Partial<Record<SyncRuleName, OverrideState>>;
  }) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

function defaultDeps(): UpdateClientOverridesDeps {
  return {
    invoke: (body) =>
      supabase.functions.invoke('update-client-overrides', { body }),
  };
}

/**
 * Pure orkestrator — razdvojeno od useMutation wrappera za lakse testiranje.
 */
export async function runUpdateClientOverrides(
  input: UpdateClientOverridesInput,
  deps: UpdateClientOverridesDeps,
): Promise<UpdateClientOverridesResponse> {
  const { data, error } = await deps.invoke({
    clientId: input.clientId,
    overrides: input.overrides,
  });

  if (error) {
    throw new Error(
      `update-client-overrides failed: ${error.message ?? String(error)}`,
    );
  }

  const payload = data as
    | UpdateClientOverridesResponse
    | { ok?: false; error?: string }
    | null;

  if (!payload || !('ok' in payload) || !payload.ok) {
    const msg =
      (payload && 'error' in payload && payload.error) ||
      'update-client-overrides returned invalid response';
    throw new Error(String(msg));
  }

  return payload as UpdateClientOverridesResponse;
}

export interface UseUpdateClientOverridesOptions {
  silent?: boolean;
  /** Dependency override za testove. */
  deps?: UpdateClientOverridesDeps;
}

/**
 * Hook za trener-side `ClientProfile` ekran.
 *
 * `clientId` se prosledjuje kroz input, ne kroz hook arg, jer trener moze
 * da menja vise klijentkinja iz jedne instance hook-a (npr. batch toggle).
 */
export function useUpdateClientOverrides(
  options: UseUpdateClientOverridesOptions = {},
) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();

  return useMutation<
    UpdateClientOverridesResponse,
    Error,
    UpdateClientOverridesInput
  >({
    mutationFn: (input) => runUpdateClientOverrides(input, deps),

    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ['userStatus', input.clientId],
      });
    },

    onError: (err) => {
      if (!options.silent) {
        toast.error(err.message || 'Override promena nije sačuvana.');
      }
    },
  });
}
