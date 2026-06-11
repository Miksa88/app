// ============================================================================
// noteExerciseId — rezolucija exercise_id ključa za exercise_notes
// ============================================================================
//
// Bugfix (strict refactor): posle swap-a vežbe, ActiveWorkout je za notes
// lookup koristio `String(override.id)` — hashovani int id iz Exercise
// library-ja, ne DB UUID. exercise_notes.exercise_id je UUID, pa beleške za
// zamenjene vežbe nikad nisu nađene (čitanje) i upisivale su se pod pogrešnim
// ključem (pisanje).
//
// Ispravno: beleška prati vežbu koja se STVARNO izvodi — kod swap-a se
// override.id (int) mapira na DB UUID preko uuidById mape (ista mapa koju
// useActiveWorkoutSession koristi za exercise history / completeSet).
// ============================================================================

import type { Exercise } from "@/types/training";

/**
 * Vraća UUID vežbe koja se stvarno izvodi — ključ za exercise_notes
 * (čitanje I pisanje moraju ići istim ključem).
 *
 * @param override     Swapovana vežba za trenutni slot (ili undefined ako nema swap-a)
 * @param slotExerciseUuid  UUID originalno izabrane vežbe iz slota
 * @param uuidById     Mapa hashovani int Exercise.id → DB UUID
 */
export function resolveNoteExerciseId(
  override: Exercise | undefined | null,
  slotExerciseUuid: string | null,
  uuidById: ReadonlyMap<number, string>,
): string | null {
  if (override) {
    return uuidById.get(override.id) ?? null;
  }
  return slotExerciseUuid;
}
