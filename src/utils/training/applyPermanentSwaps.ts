// ============================================================================
// applyPermanentSwaps — primena trajnih zamena vežbi na resolved slotove
// MVP_PRESET gap #2 — "Zameni trajno" (client_exercise_swaps tabela)
// ============================================================================
//
// Pure funkcija: poziva je useActiveWorkoutSession POSLE generateSessionSkeleton
// pipeline-a, a PRE mapiranja u UI slotove — tako se ime, UUID i istorija
// (previousMaxWeight) konzistentno izvode za zamenjenu vežbu. Jedno mesto
// primene — minimalno invazivno; automatski surgical swap (Sloj 5) netaknut.
// ============================================================================

import type { Exercise } from '@/types/training';

interface SlotWithChosenExercise {
  chosenExerciseId?: number;
}

/**
 * Zamenjuje chosenExerciseId u slotovima po mapi trajnih zamena
 * (from_exercise_id UUID → to_exercise_id UUID iz client_exercise_swaps).
 *
 * Bezbedni fallback-ovi (slot ostaje netaknut):
 *  - slot nema chosenExerciseId (pipeline nije našao vežbu)
 *  - vežba slota nema UUID u mapi (degraded mode)
 *  - nema trajne zamene za taj UUID
 *  - target vežba ne postoji u library-ju (obrisana u međuvremenu)
 */
export function applyPermanentSwaps<T extends SlotWithChosenExercise>(
  slots: T[],
  swaps: Map<string, string>,
  exerciseLibrary: Exercise[],
  uuidById: Map<number, string>,
): T[] {
  if (swaps.size === 0) return slots;

  // Reverse map UUID → int id (uuidById je int id → UUID)
  const idByUuid = new Map<string, number>();
  for (const [id, uuid] of uuidById) {
    idByUuid.set(uuid, id);
  }

  return slots.map((slot) => {
    if (slot.chosenExerciseId === undefined) return slot;

    const fromUuid = uuidById.get(slot.chosenExerciseId);
    if (!fromUuid) return slot;

    const toUuid = swaps.get(fromUuid);
    if (!toUuid || toUuid === fromUuid) return slot;

    const toId = idByUuid.get(toUuid);
    if (toId === undefined) return slot;

    const target = exerciseLibrary.find((ex) => ex.id === toId);
    if (!target) return slot;

    return { ...slot, chosenExerciseId: target.id };
  });
}
