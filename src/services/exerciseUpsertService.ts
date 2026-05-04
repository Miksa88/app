// ============================================================================
// exerciseUpsertService — trener CRUD nad exercises (P0-2)
// ============================================================================
//
// Različito od `src/utils/db/exerciseLibrary.ts` (read-only listSystem).
// Trener pravi/menja custom vežbe — RLS dozvoljava samo svoje
// (`is_system_exercise=false, created_by_trainer_id=auth.uid()`).
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export interface UpsertExerciseInput {
  id?: string;
  name: string;
  nameSr?: string;
  movementPattern: string;
  primaryMuscle: string;
  difficulty: 'beginner_safe' | 'intermediate' | 'advanced';
  equipment: string[];
  instructions: string;
  videoUrl?: string | null;
}

export interface ExerciseUpsertResult {
  id: string;
}

export async function upsertExercise(
  input: UpsertExerciseInput,
  trainerId: string,
): Promise<ExerciseUpsertResult> {
  const payload = {
    name: input.name,
    name_sr: input.nameSr ?? input.name,
    movement_pattern: input.movementPattern,
    primary_muscle: input.primaryMuscle,
    secondary_muscles: [],
    tension_profile: 'mid_range',
    cns_load: 3,
    fatigue_index: 3,
    equipment: input.equipment,
    difficulty: input.difficulty,
    requires_stabilization: false,
    contraindications: [],
    gentle_on: [],
    weight_increment: 2.5,
    is_bilateral: true,
    video_url: input.videoUrl ?? null,
    instructions: input.instructions,
    is_glute_builder: false,
    is_compound: false,
    is_finisher_eligible: false,
    is_system_exercise: false,
    created_by_trainer_id: trainerId,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("exercises")
      .update(payload)
      .eq("id", input.id)
      .select("id")
      .single();
    if (error) throw new Error(`upsertExercise(update): ${error.message}`);
    return { id: data.id };
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(`upsertExercise(insert): ${error.message}`);
  return { id: data.id };
}
