// ============================================================================
// useFinishWorkout — mutation hook za zavrsetak treninga
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 7 + IT-7 Edge Function
// ============================================================================
//
// Klijent-side wrapper oko `process-workout-completion` Edge Function-a.
// Server:
//   1. Validira da queue.sessions[pointer].sessionId === sessionId
//   2. Napreduje pointer (advancePointerAfterCompletion)
//   3. Decrement RFB countdown / illness penalty sessions
//   4. Run runSyncRules
//   5. Save UserStatus
//   6. Emit WORKOUT_COMPLETED event
//
// Zbog RLS-a na user_status (samo service_role sme da pise), sav pisanje ide
// kroz Edge Function — klijent samo POST-uje completedAt + sessionId.
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

export interface FinishWorkoutInput {
  clientId: string;
  sessionId: string;
  /** ISO timestamp, default = now */
  completedAt?: string;
}

export interface FinishWorkoutResponse {
  ok: true;
  queueAdvanced: boolean;
  /** Puni UserStatus posle napretka pointer-a (za optimistic UI update). */
  status?: unknown;
}

export interface FinishWorkoutDeps {
  invoke: (body: {
    clientId: string;
    sessionId: string;
    completedAt: string;
  }) => Promise<{ data: unknown; error: { message?: string } | null }>;
}

function defaultDeps(): FinishWorkoutDeps {
  return {
    invoke: (body) =>
      supabase.functions.invoke('process-workout-completion', { body }),
  };
}

/**
 * Pure orkestrator — razdvojeno od useMutation wrappera za lakse testiranje
 * (bez QueryClientProvider-a).
 */
export async function runFinishWorkout(
  input: FinishWorkoutInput,
  deps: FinishWorkoutDeps,
): Promise<FinishWorkoutResponse> {
  const { data, error } = await deps.invoke({
    clientId: input.clientId,
    sessionId: input.sessionId,
    completedAt: input.completedAt ?? new Date().toISOString(),
  });

  if (error) {
    throw new Error(
      `process-workout-completion failed: ${error.message ?? String(error)}`,
    );
  }

  const payload = data as
    | FinishWorkoutResponse
    | { ok?: false; error?: string }
    | null;
  if (!payload || !('ok' in payload) || !payload.ok) {
    const msg =
      (payload && 'error' in payload && payload.error) ||
      'process-workout-completion returned invalid response';
    throw new Error(String(msg));
  }

  return payload as FinishWorkoutResponse;
}

export interface UseFinishWorkoutOptions {
  silent?: boolean;
  /** Dependency override za testove. */
  deps?: FinishWorkoutDeps;
}

export function useFinishWorkout(options: UseFinishWorkoutOptions = {}) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();

  return useMutation<FinishWorkoutResponse, Error, FinishWorkoutInput>({
    mutationFn: (input) => runFinishWorkout(input, deps),

    onSuccess: (_, vars) => {
      // Realtime push treba da osvezi useUserStatus, invalidate je defensive
      // fallback za slucaj da je subscription pao.
      queryClient.invalidateQueries({ queryKey: ['userStatus', vars.clientId] });
    },

    onError: (err) => {
      if (!options.silent) {
        toast.error('Trening nije sacuvan', {
          description: err.message,
        });
      }
    },
  });
}
