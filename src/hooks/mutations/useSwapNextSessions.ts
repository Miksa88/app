// ============================================================================
// useSwapNextSessions — mutation hook za zamenu sledece dve sesije
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 2.5 (Swap request) + IT-10
// ============================================================================
//
// Klijent-side wrapper oko `swap-next-sessions` Edge Function-a.
// Server:
//   1. Validira canSwapNextTwoSessions(queue)
//   2. Swap-uje queue.sessions[pointer] i queue.sessions[pointer+1]
//   3. Postavlja swapUsedThisMicrocycle = true
//   4. Rekomputira nextSessionId / nextSessionPartition
//   5. Upsert UserStatus
//
// UI feedback:
//   - Success toast sa Undo akcijom (30s duration)
//   - Undo poziva istu mutaciju ponovo (drugi swap nije tehnicki undo — u istom
//     mikrociklusu ce biti odbijen; bitno je da user vidi feedback)
//   - Error toast sa porukom iz EF-a
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

export interface SwapNextSessionsInput {
  clientId: string;
}

export interface SwapNextSessionsResponse {
  ok: true;
  success: true;
  newFirstSession?: unknown;
  status?: unknown;
}

export interface SwapNextSessionsDeps {
  invoke: (body: {
    clientId: string;
  }) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

function defaultDeps(): SwapNextSessionsDeps {
  return {
    invoke: (body) =>
      supabase.functions.invoke('swap-next-sessions', { body }),
  };
}

/**
 * Pure orkestrator — razdvojeno od useMutation wrappera za lakse testiranje
 * (bez QueryClientProvider-a). Isti pattern kao runFinishWorkout / runDailyCheckIn.
 */
export async function runSwapNextSessions(
  input: SwapNextSessionsInput,
  deps: SwapNextSessionsDeps,
): Promise<SwapNextSessionsResponse> {
  const { data, error } = await deps.invoke({
    clientId: input.clientId,
  });

  if (error) {
    throw new Error(
      `swap-next-sessions failed: ${error.message ?? String(error)}`,
    );
  }

  const payload = data as
    | SwapNextSessionsResponse
    | { ok?: false; error?: string }
    | null;

  if (!payload || !('ok' in payload) || !payload.ok) {
    const msg =
      (payload && 'error' in payload && payload.error) ||
      'swap-next-sessions returned invalid response';
    throw new Error(String(msg));
  }

  return payload as SwapNextSessionsResponse;
}

export interface UseSwapNextSessionsOptions {
  silent?: boolean;
  /** Dependency override za testove. */
  deps?: SwapNextSessionsDeps;
  /** i18n translate funkcija — podrazumevano radi sa sr/en keys iz useSwapNextSessions. */
  t?: (key: string) => string;
}

/**
 * React Query hook — tanak wrapper oko runSwapNextSessions sa toast + undo logic.
 *
 * `clientId` se prosleđuje iz AuthContext-a pozivaoca. Ako se izbaci hook-u,
 * moze da se prosledi `undefined` i `.mutate({ clientId: 'x' })` direktno.
 */
export function useSwapNextSessions(
  clientId: string | null,
  options: UseSwapNextSessionsOptions = {},
) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();
  // Fallback translator — testovi mogu da preskoce LanguageContext.
  const translate = options.t ?? ((key: string) => key);

  const mutation = useMutation<
    SwapNextSessionsResponse,
    Error,
    SwapNextSessionsInput
  >({
    mutationFn: (input) => runSwapNextSessions(input, deps),

    onSuccess: (_, vars) => {
      // Realtime push treba da osvezi useUserStatus; invalidate je defensive
      // fallback za slucaj da je subscription pao (mobile backgrounding).
      queryClient.invalidateQueries({ queryKey: ['userStatus', vars.clientId] });

      if (!options.silent) {
        toast.success(translate('gym.swapSuccess'), {
          duration: 30_000, // 30s window za Undo
          action: {
            label: translate('gym.swapUndo'),
            // Undo: drugi swap poziv. U istom mikrociklusu ce biti odbijen
            // (swapUsedThisMicrocycle=true), ali user vidi feedback — za sad
            // prihvatljivo dok ne implementiramo audit-trail Undo.
            onClick: () => {
              mutation.mutate({ clientId: vars.clientId });
            },
          },
        });
      }
    },

    onError: (err) => {
      if (!options.silent) {
        toast.error(err.message || translate('gym.swapNotAllowed'));
      }
    },
  });

  // Expose clientId-bound convenience variant: ako je hook pozvan sa
  // clientId != null, komponenta moze da zove `swap()` bez argumenata.
  return {
    ...mutation,
    swap: () => {
      if (!clientId) {
        const msg = 'useSwapNextSessions: clientId is null';
        toast.error(translate('gym.swapNotAllowed'));
        throw new Error(msg);
      }
      mutation.mutate({ clientId });
    },
  };
}
