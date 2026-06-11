// ============================================================================
// useStartPause — mutation hook za pocetak pauze (illness/travel)
// Spec: 01_TRAINING_FLOW_MASTER.md §4.8 (Pauza modul) + IT-16
// ============================================================================
//
// Klijent-side wrapper oko `start-pause` Edge Function-a.
// Server:
//   1. Insert u pause_events (parcijalni UNIQUE = jedna aktivna pauza/user)
//   2. Patch UserStatus.training.activePauseEvent + upsert
//   3. Vraca novi DB red + novi UserStatus
//
// Pattern: isti kao useSwapNextSessions / useDailyCheckIn — pure orchestrator
// odvojen od useMutation wrappera radi lakseg testiranja (bez QueryClientProvider).
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

export type PauseType = 'illness' | 'travel';

export interface StartPauseInput {
  clientId: string;
  pauseType: PauseType;
  /** ISO string ili YYYY-MM-DD. Default: poziv-ovi mogu prosledi new Date().toISOString(). */
  startDate: string;
  /**
   * Planirani kraj pauze (YYYY-MM-DD). null/undefined = "dok se ne vratim".
   * Server validira max 30 dana za klijent-iniciranu pauzu.
   */
  pauseUntil?: string | null;
  notes?: string;
}

export interface StartPauseResponse {
  ok: true;
  pauseEvent: unknown;
  status: unknown;
}

export interface StartPauseDeps {
  invoke: (body: {
    clientId: string;
    pauseType: PauseType;
    startDate: string;
    pauseUntil?: string;
    notes?: string;
  }) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

function defaultDeps(): StartPauseDeps {
  return {
    invoke: (body) => supabase.functions.invoke('start-pause', { body }),
  };
}

/**
 * Pure orkestrator — razdvojeno od useMutation wrappera za lakse testiranje.
 */
export async function runStartPause(
  input: StartPauseInput,
  deps: StartPauseDeps,
): Promise<StartPauseResponse> {
  const { data, error } = await deps.invoke({
    clientId: input.clientId,
    pauseType: input.pauseType,
    startDate: input.startDate,
    pauseUntil: input.pauseUntil ?? undefined,
    notes: input.notes,
  });

  if (error) {
    throw new Error(
      `start-pause failed: ${error.message ?? String(error)}`,
    );
  }

  const payload = data as
    | StartPauseResponse
    | { ok?: false; error?: string }
    | null;

  if (!payload || !('ok' in payload) || !payload.ok) {
    const msg =
      (payload && 'error' in payload && payload.error) ||
      'start-pause returned invalid response';
    throw new Error(String(msg));
  }

  return payload as StartPauseResponse;
}

export interface UseStartPauseOptions {
  silent?: boolean;
  /** Dependency override za testove. */
  deps?: StartPauseDeps;
}

export function useStartPause(
  clientId: string | null,
  options: UseStartPauseOptions = {},
) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();

  return useMutation<StartPauseResponse, Error, Omit<StartPauseInput, 'clientId'>>({
    mutationFn: (input) => {
      if (!clientId) {
        throw new Error('useStartPause: clientId is null');
      }
      return runStartPause({ clientId, ...input }, deps);
    },

    onSuccess: () => {
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['userStatus', clientId] });
        // start-pause EF mirror-uje pauzu u profiles.pause_state —
        // osvezi i banner/Gym blokadu (useClientPause cache).
        queryClient.invalidateQueries({ queryKey: ['clientPause', clientId] });
      }
    },

    onError: (err) => {
      if (!options.silent) {
        toast.error(err.message || 'Pauza nije pokrenuta.');
      }
    },
  });
}
