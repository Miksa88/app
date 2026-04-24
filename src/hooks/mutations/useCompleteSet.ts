// ============================================================================
// useCompleteSet — mutation hook za log jednog seta
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 6 (exercise_progress istorija)
// ============================================================================
//
// INSERT u `exercise_progress` direktno iz klijenta — RLS policy dozvoljava
// klijentkinji da pise svoju istoriju (vlasnik CRUD). Edge Function nije
// potreban jer ne treba sync rule orkestracija po setu (tek posle finish
// workout-a se pokrece runSyncRules iz process-workout-completion).
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

export interface CompleteSetInput {
  userId: string;
  exerciseId: string;
  workoutSessionId?: string | null;
  setNumber: number;
  weightKg: number;
  reps: number;
  rir?: number | null;
}

export interface CompletedSetRow {
  id: string;
  user_id: string;
  exercise_id: string;
  workout_session_id: string | null;
  set_number: number;
  weight_kg: number;
  reps: number;
  rir: number | null;
  completed_at: string;
  created_at: string;
}

export interface CompleteSetDeps {
  insertSet: (
    row: {
      user_id: string;
      exercise_id: string;
      workout_session_id: string | null;
      set_number: number;
      weight_kg: number;
      reps: number;
      rir: number | null;
    },
  ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
}

function defaultDeps(): CompleteSetDeps {
  return {
    insertSet: async (row) => {
      const result = await supabase
        .from('exercise_progress')
        .insert(row)
        .select()
        .single();
      return { data: result.data, error: result.error };
    },
  };
}

/**
 * Pure orkestrator — testable bez React konteksta.
 */
export async function runCompleteSet(
  input: CompleteSetInput,
  deps: CompleteSetDeps,
): Promise<CompletedSetRow> {
  const { data, error } = await deps.insertSet({
    user_id: input.userId,
    exercise_id: input.exerciseId,
    workout_session_id: input.workoutSessionId ?? null,
    set_number: input.setNumber,
    weight_kg: input.weightKg,
    reps: input.reps,
    rir: input.rir ?? null,
  });

  if (error) {
    throw new Error(
      `exercise_progress insert failed: ${error.code ?? ''} ${error.message ?? ''}`.trim(),
    );
  }
  if (!data) {
    throw new Error('exercise_progress insert returned no row');
  }

  return data as CompletedSetRow;
}

export interface UseCompleteSetOptions {
  silent?: boolean;
  deps?: CompleteSetDeps;
}

export function useCompleteSet(options: UseCompleteSetOptions = {}) {
  const queryClient = useQueryClient();
  const deps = options.deps ?? defaultDeps();

  return useMutation<CompletedSetRow, Error, CompleteSetInput>({
    mutationFn: (input) => runCompleteSet(input, deps),

    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['exerciseProgress', vars.userId, vars.exerciseId],
      });
    },

    onError: (err) => {
      if (!options.silent) {
        toast.error('Set nije sacuvan', {
          description: err.message,
        });
      }
    },
  });
}
