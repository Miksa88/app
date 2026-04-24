// ============================================================================
// exerciseLibrary DB helpers
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 4.4 (Exercise Library)
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  Exercise, MovementPattern, MuscleGroup, InjuryTag, Equipment, TensionProfile,
} from '@/types/training';

// ============================================================================
// rowToExercise — DB row → TS Exercise interface
// ============================================================================

interface ExerciseRow {
  id: string;
  name: string;
  name_sr: string;
  is_system_exercise: boolean;
  created_by_trainer_id: string | null;
  movement_pattern: string;
  primary_muscle: string;
  secondary_muscles: string[];
  tension_profile: string;
  cns_load: number;
  fatigue_index: number;
  equipment: string[];
  difficulty: string;
  requires_stabilization: boolean;
  contraindications: string[];
  gentle_on: string[];
  weight_increment: number;
  is_bilateral: boolean;
  video_url: string | null;
  instructions: string;
  is_glute_builder: boolean;
  is_compound: boolean;
  is_finisher_eligible: boolean;
}

function rowToExercise(row: ExerciseRow): Exercise {
  return {
    // Map UUID → numeric ID kroz hash; ID se ne koristi za FK relacije sa
    // exercises u skeleton-ima, samo za interno upoređivanje slot.chosenExerciseId
    id: hashUuidToInt(row.id),
    name: row.name,
    nameSr: row.name_sr,
    isSystemExercise: row.is_system_exercise,
    createdByTrainerId: row.created_by_trainer_id,
    movementPattern: row.movement_pattern as MovementPattern,
    primaryMuscle: row.primary_muscle as MuscleGroup,
    secondaryMuscles: row.secondary_muscles as MuscleGroup[],
    tensionProfile: row.tension_profile as TensionProfile,
    cnsLoad: row.cns_load as 1 | 2 | 3 | 4 | 5,
    fatigueIndex: row.fatigue_index as 1 | 2 | 3 | 4 | 5,
    equipment: row.equipment as Equipment[],
    difficulty: row.difficulty as Exercise['difficulty'],
    requiresStabilization: row.requires_stabilization,
    contraindications: row.contraindications as InjuryTag[],
    gentleOn: row.gentle_on as InjuryTag[],
    weightIncrement: Number(row.weight_increment),
    isBilateral: row.is_bilateral,
    videoUrl: row.video_url,
    instructions: row.instructions,
    isGluteBuilder: row.is_glute_builder,
    isCompound: row.is_compound,
    isFinisherEligible: row.is_finisher_eligible,
  };
}

// Stabilan hash UUID → number (za TS Exercise.id : number compat)
// Koristi prvih 8 hex karaktera UUID-a — dovoljno unikatno za UI list keys.
export function hashUuidToInt(uuid: string): number {
  return parseInt(uuid.replace(/-/g, '').slice(0, 8), 16);
}

// ============================================================================
// listSystemExercises — sve sistemske vežbe (za pickExerciseForSlot pool)
// ============================================================================

export async function listSystemExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_system_exercise', true)
    .order('movement_pattern', { ascending: true });

  if (error) {
    throw new Error(`listSystemExercises failed: ${error.message}`);
  }

  return (data ?? []).map(row => rowToExercise(row as ExerciseRow));
}

/**
 * Isto kao `listSystemExercises`, ali vraca i Map<number, string> koji povezuje
 * hashovani `Exercise.id` (int) sa originalnim DB UUID-om. Potreban za DPO
 * lookup koji ide preko `exercise_progress.exercise_id` (UUID) dok
 * `exerciseHistoryMap` u programGenerator-u kljucuje na int.
 */
export async function listSystemExercisesWithUuids(): Promise<{
  exercises: Exercise[];
  uuidById: Map<number, string>;
}> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_system_exercise', true)
    .order('movement_pattern', { ascending: true });

  if (error) {
    throw new Error(`listSystemExercisesWithUuids failed: ${error.message}`);
  }

  const rows = (data ?? []) as ExerciseRow[];
  const exercises = rows.map(rowToExercise);
  const uuidById = new Map<number, string>();
  rows.forEach((row) => {
    uuidById.set(hashUuidToInt(row.id), row.id);
  });

  return { exercises, uuidById };
}

// ============================================================================
// listExercisesByPattern — filter po movement pattern + muscle (za UI picker)
// ============================================================================

export async function listExercisesByPattern(
  movementPattern: MovementPattern,
  muscleGroup?: MuscleGroup,
): Promise<Exercise[]> {
  let query = supabase
    .from('exercises')
    .select('*')
    .eq('movement_pattern', movementPattern);

  if (muscleGroup) {
    query = query.eq('primary_muscle', muscleGroup);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`listExercisesByPattern(${movementPattern}) failed: ${error.message}`);
  }

  return (data ?? []).map(row => rowToExercise(row as ExerciseRow));
}
