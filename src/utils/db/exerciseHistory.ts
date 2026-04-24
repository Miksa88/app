// ============================================================================
// exerciseHistory — thin DB wrapper za exercise_progress
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 6 (Loading Sloj 4 DPO input)
// ============================================================================
//
// Vraca poslednjih N setova za dati user_id + exercise_id (DESC po
// completed_at). Rezultat je ulaz za `calcNextWeight` iz dpoCalculator.ts.
//
// Nema testa — tanak wrapper oko Supabase klijenta. Mock se radi na nivou
// pozivalaca (mutation hookovi, integration testovi).
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export interface ExerciseHistoryRow {
  weight_kg: number;
  reps: number;
  set_number: number;
  rir: number | null;
  completed_at: string;
}

export async function loadExerciseHistory(
  userId: string,
  exerciseId: string,
  limit = 10,
): Promise<ExerciseHistoryRow[]> {
  const { data, error } = await supabase
    .from('exercise_progress')
    .select('weight_kg, reps, set_number, rir, completed_at')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`loadExerciseHistory: ${error.message}`);

  return (data ?? []).map((r) => ({
    weight_kg: Number(r.weight_kg),
    reps: r.reps,
    set_number: r.set_number,
    rir: r.rir,
    completed_at: r.completed_at,
  }));
}
