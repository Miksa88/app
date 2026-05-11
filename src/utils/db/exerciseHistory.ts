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

/**
 * Batch verzija — jedan IN query za N vežbi (N+1 elimination).
 * Vraca Map<exerciseUuid, ExerciseHistoryRow[]> sortiran DESC po completed_at;
 * limit se primjenjuje per exercise (heuristika: limit * N rows ukupno,
 * onda truncate per exercise u kodu — server-side per-group limit nije
 * trivijalan u Supabase REST API-u bez RPC funkcije).
 */
export async function loadExerciseHistoryBatch(
  userId: string,
  exerciseIds: string[],
  limitPerExercise = 10,
): Promise<Map<string, ExerciseHistoryRow[]>> {
  const out = new Map<string, ExerciseHistoryRow[]>();
  if (exerciseIds.length === 0) return out;

  const { data, error } = await supabase
    .from('exercise_progress')
    .select('exercise_id, weight_kg, reps, set_number, rir, completed_at')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .order('completed_at', { ascending: false })
    .limit(limitPerExercise * exerciseIds.length);

  if (error) throw new Error(`loadExerciseHistoryBatch: ${error.message}`);

  for (const id of exerciseIds) out.set(id, []);

  for (const r of data ?? []) {
    const arr = out.get(r.exercise_id);
    if (!arr) continue;
    if (arr.length < limitPerExercise) {
      arr.push({
        weight_kg: Number(r.weight_kg),
        reps: r.reps,
        set_number: r.set_number,
        rir: r.rir,
        completed_at: r.completed_at,
      });
    }
  }

  return out;
}
