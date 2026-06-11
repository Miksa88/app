// ============================================================================
// useEndPause — mutation hook za zavrsetak aktivne pauze
// Spec: 01_TRAINING_FLOW_MASTER.md §4.8 (Pauza modul) + IT-16
// ============================================================================
//
// Klijent-side wrapper oko `end-pause` Edge Function-a.
// Server:
//   1. UPDATE pause_events SET is_active=false, end_date=<endDate||today>
//      WHERE user_id=auth.uid AND is_active=true
//   2. Patch UserStatus.training.activePauseEvent = null + upsert
//
// Napomena: illness penalty countdown (penalty_sessions_remaining) se NE
// resetuje — ostaje na pause_events redu i troshi se kroz
// process-workout-completion. end-pause samo gasi pauzu.
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

export interface EndPauseInput {
  clientId: string;
  /** ISO ili YYYY-MM-DD; ako undefined, server koristi danasnji datum. */
  endDate?: string;
}

export interface EndPauseResponse {
  ok: true;
  status: unknown;
  endedPauseEvent?: unknown;
}

export interface EndPauseDeps {
  invoke: (body: {
    clientId: string;
    endDate?: string;
  }) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

function defaultDeps(): EndPauseDeps {
  return {
    invoke: (body) => supabase.functions.invoke('end-pause', { body }),
  };
}

/**
 * Pure orkestrator — razdvojeno od useMutation wrappera za lakse testiranje.
 */
export async function runEndPause(
  input: EndPauseInput,
  deps: EndPauseDeps,
): Promise<EndPauseResponse> {
  const { data, error } = await deps.invoke({
    clientId: input.clientId,
    endDate: input.endDate,
  });

  if (error) {
    throw new Error(
      `end-pause failed: ${error.message ?? String(error)}`,
    );
  }

  const payload = data as
    | EndPauseResponse
    | { ok?: false; error?: string }
    | null;

  if (!payload || !('ok' in payload) || !payload.ok) {
    const msg =
      (payload && 'error' in payload && payload.error) ||
      'end-pause returned invalid response';
    throw new Error(String(msg));
  }

  return payload as EndPauseResponse;
}

export interface UseEndPauseOptions {
  silent?: boolean;
  /** Dependency override za testove. */
  deps?: EndPauseDeps;
}

export function useEndPause(
  clientId: string | null,
  options: UseEndPauseOptions = {},
) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();

  return useMutation<EndPauseResponse, Error, Omit<EndPauseInput, 'clientId'> | void>({
    mutationFn: (input) => {
      if (!clientId) {
        throw new Error('useEndPause: clientId is null');
      }
      return runEndPause({ clientId, endDate: input?.endDate }, deps);
    },

    onSuccess: () => {
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['userStatus', clientId] });
        // end-pause EF cisti profiles.pause_state mirror —
        // osvezi i banner/Gym blokadu (useClientPause cache).
        queryClient.invalidateQueries({ queryKey: ['clientPause', clientId] });
      }
    },

    onError: (err) => {
      if (!options.silent) {
        toast.error(err.message || 'Zavrsetak pauze nije uspeo.');
      }
    },
  });
}
