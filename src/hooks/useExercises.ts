// ============================================================================
// useExercises — React Query hook za exercises tabelu
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 4.4 (Exercise Library), W-1 wire-up
// ============================================================================
//
// Ovaj hook zamenjuje statički `EXERCISE_LIBRARY` import u trainer stranicama.
// Učitava redove iz Supabase `exercises` tabele preko `listSystemExercises()`
// (RLS: SELECT za sve authenticated; is_system_exercise=true), pa ih mapira u
// legacy `ExerciseItem` oblik (src/data/trainerMockData.ts) kako bi postojeći
// UI (ExercisePicker, TrainerTraining, ExerciseDetail, WorkoutEditor) radio
// bez refactor-a UI-ja.
//
// Adapter mapping (DB Exercise → ExerciseItem):
//   - id: hashUuidToInt(uuid) — stabilan int za UI list keys i selected Set<number>
//   - name: nameSr (Serbian) ili fallback na name (English)
//   - category: derivat iz movementPattern (Serbian, npr. 'Noge', 'Grudi'...)
//   - subcategory: derivat iz primaryMuscle (Serbian, npr. 'Kvadricepsi'...)
//   - equipment: pass-through string[] (već je string[] u DB-u)
//   - difficulty: 'beginner_safe' → 'beginner', ostalo as-is
//   - videoUrl, instructions: pass-through
//   - defaultVideoUrl: '' (legacy field, nikad nije bio popunjen)
//
// Query key: `['exercises','system']` — globalan (svi treneri vide isti
// sistemski pool sistemskih vežbi).
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import {
  hashUuidToInt,
  listSystemExercises,
} from '@/utils/db/exerciseLibrary';
import type {
  Exercise,
  MovementPattern,
  MuscleGroup,
} from '@/types/training';

// ============================================================================
// ExerciseItem — UI shape koju trainer stranice konzumiraju
// (Bivši export iz src/data/trainerMockData.ts; ovde je kanonski izvor)
// ============================================================================

export interface ExerciseItem {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  videoUrl: string | null;
  defaultVideoUrl: string;
  instructions: string;
}

// ============================================================================
// Mapping tables — MovementPattern → category, MuscleGroup → subcategory
// Serbian labels matche EXERCISE_CATEGORIES iz trainerMockData.ts (legacy UI)
// ============================================================================

const MOVEMENT_TO_CATEGORY: Record<MovementPattern, string> = {
  knee_dominant: 'Noge',
  hip_dominant: 'Noge',
  abduction: 'Noge',
  adduction: 'Noge',
  calf_raise: 'Noge',
  horizontal_push: 'Grudi',
  vertical_push: 'Ramena',
  isolation_lateral_delt: 'Ramena',
  isolation_rear_delt: 'Ramena',
  horizontal_pull: 'Leđa',
  vertical_pull: 'Leđa',
  isolation_biceps: 'Ruke',
  isolation_triceps: 'Ruke',
  core_antirotation: 'Core',
  core_flexion: 'Core',
  cardio_liss: 'Kardio',
  cardio_hiit: 'Kardio',
  carry: 'Full Body',
};

const MUSCLE_TO_SUBCATEGORY: Record<MuscleGroup, string> = {
  quads: 'Kvadricepsi',
  hamstrings: 'Hamstringsi',
  glutes: 'Gluteus',
  glutes_med: 'Gluteus',
  calves: 'Listovi',
  chest: 'Srednji deo',
  back_lats: 'Latisimus',
  back_upper: 'Gornja leđa',
  back_lower: 'Donja leđa',
  shoulders_front: 'Prednji delt',
  shoulders_side: 'Bočni delt',
  shoulders_rear: 'Zadnji delt',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Podlaktica',
  core: 'Trbušnjaci',
  obliques: 'Kosi mišići',
  full_body: 'Funkcionalni',
};

// ============================================================================
// Adapter: DB Exercise → ExerciseItem (UI shape)
// ============================================================================

export function exerciseToItem(ex: Exercise): ExerciseItem {
  // beginner_safe → beginner; ostalo as-is (DB-level enum su iste vrednosti)
  const difficulty: ExerciseItem['difficulty'] =
    ex.difficulty === 'beginner_safe'
      ? 'beginner'
      : (ex.difficulty as ExerciseItem['difficulty']);

  return {
    id: ex.id,
    // Preferiramo srpski naziv (nameSr); fallback na engleski (name) ako je prazan
    name: ex.nameSr && ex.nameSr.trim().length > 0 ? ex.nameSr : ex.name,
    category: MOVEMENT_TO_CATEGORY[ex.movementPattern] ?? 'Full Body',
    subcategory: MUSCLE_TO_SUBCATEGORY[ex.primaryMuscle] ?? 'Funkcionalni',
    // equipment u DB-u je već string[], pass-through
    equipment: ex.equipment as unknown as string[],
    difficulty,
    videoUrl: ex.videoUrl,
    defaultVideoUrl: '',
    instructions: ex.instructions,
  };
}

// ============================================================================
// Loader — listSystemExercises + map kroz adapter
// ============================================================================

async function loadExerciseItems(): Promise<ExerciseItem[]> {
  const exercises = await listSystemExercises();
  return exercises.map(exerciseToItem);
}

// ============================================================================
// useExercises — pun spisak sistemskih vežbi (ExerciseItem[])
// ============================================================================

export function useExercises() {
  return useQuery<ExerciseItem[], Error>({
    queryKey: ['exercises', 'system'],
    queryFn: loadExerciseItems,
    // Exercise pool se ne menja često — keširaj 5 min pre refetch-a
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// useExercise — single exercise lookup po ID-u
// Prima EITHER hashed-int id OR UUID string. Implementacija učitava ceo
// pool (deli isti cache key kao useExercises) i traži po id-u.
// ============================================================================

export function useExercise(idOrUuid: number | string | undefined | null) {
  const query = useExercises();

  // Compute target int id iz različitih input formata
  let targetId: number | null = null;
  if (idOrUuid != null) {
    if (typeof idOrUuid === 'number') {
      targetId = idOrUuid;
    } else if (typeof idOrUuid === 'string') {
      // UUID string ima dash-eve i dužinu > 10; numerički string parse-ujemo
      const trimmed = idOrUuid.trim();
      if (trimmed.length > 10 && trimmed.includes('-')) {
        targetId = hashUuidToInt(trimmed);
      } else {
        const parsed = parseInt(trimmed, 10);
        targetId = Number.isFinite(parsed) ? parsed : null;
      }
    }
  }

  const data =
    targetId != null && query.data
      ? query.data.find((ex) => ex.id === targetId) ?? null
      : null;

  return {
    ...query,
    data,
  };
}
