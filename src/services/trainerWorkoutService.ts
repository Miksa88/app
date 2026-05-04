// ============================================================================
// trainerWorkoutService — CRUD za workouts tabelu (W-2 wire-up)
// ============================================================================
//
// NE MEŠATI sa workoutService.ts (workout lifecycle / completion engine).
// Ovaj service je striktno trener-side CRUD nad `workouts` tabelom — koristi
// se u ProgramEditor / WorkoutEditor / TrainerTraining stranicama.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { WorkoutSection } from "@/data/trainingMockData";

type Row = Database["public"]["Tables"]["workouts"]["Row"];

export interface WorkoutRecord {
  id: string;
  trainerId: string;
  name: string;
  description: string | null;
  sections: WorkoutSection[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

function toRecord(row: Row): WorkoutRecord {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    name: row.name,
    description: row.description,
    sections: (row.sections as unknown as WorkoutSection[]) ?? [],
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTrainerWorkouts(trainerId: string): Promise<WorkoutRecord[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listTrainerWorkouts: ${error.message}`);
  return (data ?? []).map(toRecord);
}

export async function getWorkoutById(id: string): Promise<WorkoutRecord | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getWorkoutById: ${error.message}`);
  return data ? toRecord(data) : null;
}

export interface UpsertWorkoutInput {
  id?: string;
  trainerId: string;
  name: string;
  description?: string | null;
  sections: WorkoutSection[];
}

export async function upsertWorkout(input: UpsertWorkoutInput): Promise<WorkoutRecord> {
  const payload = {
    trainer_id: input.trainerId,
    name: input.name,
    description: input.description ?? null,
    sections: input.sections as unknown as Database["public"]["Tables"]["workouts"]["Insert"]["sections"],
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("workouts")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(`upsertWorkout(update): ${error.message}`);
    return toRecord(data);
  }
  const { data, error } = await supabase
    .from("workouts")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`upsertWorkout(insert): ${error.message}`);
  return toRecord(data);
}

export async function archiveWorkout(id: string): Promise<void> {
  const { error } = await supabase
    .from("workouts")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) throw new Error(`archiveWorkout: ${error.message}`);
}
