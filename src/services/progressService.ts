// ============================================================================
// progressService — čitanje exercise_progress + weight_logs (Task 1.1)
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export interface TodaySetRow {
  exercise_id: string;
  weight_kg: number;
  reps: number;
  set_number: number;
  completed_at: string;
}

/** Svi setovi od početka lokalnog dana — PostWorkout summary. */
export async function getTodaySets(clientId: string): Promise<TodaySetRow[]> {
  // Dan u ISO format: pocetak lokalnog dana u UTC (jednostavno — last 24h).
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("exercise_progress")
    .select("exercise_id, weight_kg, reps, set_number, completed_at")
    .eq("user_id", clientId)
    .gte("completed_at", since.toISOString())
    .order("completed_at", { ascending: true });

  if (error) throw new Error(`loadTodaySets: ${error.message}`);
  return (data ?? []).map((r) => ({
    exercise_id: r.exercise_id,
    weight_kg: Number(r.weight_kg),
    reps: r.reps,
    set_number: r.set_number,
    completed_at: r.completed_at,
  }));
}

/**
 * Prosečna težina (kg) iz weight_logs poslednjih N dana — WeeklyCheckIn
 * auto-prefill. Vraća null ako nema validnih unosa.
 */
export async function getRecentWeightAvgKg(
  clientId: string,
  days = 3,
): Promise<number | null> {
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("weight_logs")
    .select("weight_kg, logged_at")
    .eq("user_id", clientId)
    .gte("logged_at", sinceIso)
    .order("logged_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(`getRecentWeightAvgKg: ${error.message}`);
  const values = (data ?? [])
    .map((r) => Number(r.weight_kg))
    .filter((v) => Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
