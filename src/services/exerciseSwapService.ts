// ============================================================================
// exerciseSwapService — trajne zamene vežbi po klijentu
// MVP_PRESET gap #2 — "Zameni trajno" toggle u SwapExerciseSheet
// ============================================================================
//
// Persistencija: client_exercise_swaps (client_id, from_exercise_id UUID,
// to_exercise_id UUID, UNIQUE(client_id, from_exercise_id)).
// RLS: klijentkinja CRUD svoje redove, trener SELECT/DELETE sve.
//
// Primena: useActiveWorkoutSession učitava mapu i kroz applyPermanentSwaps
// zamenjuje from→to PRE rendera. Per-session override (lokalni state u
// ActiveWorkout) ostaje mehanizam za jednokratne zamene.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

/**
 * Učitava sve trajne zamene klijentkinje kao mapu from_exercise_id (UUID)
 * → to_exercise_id (UUID).
 */
export async function getClientExerciseSwaps(
  clientId: string,
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("client_exercise_swaps")
    .select("from_exercise_id, to_exercise_id")
    .eq("client_id", clientId);

  if (error) {
    throw new Error(`getClientExerciseSwaps(${clientId}) failed: ${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.from_exercise_id, row.to_exercise_id);
  }
  return map;
}

/**
 * Upsert trajne zamene — jedna po (klijent, izvorna vežba); novi izbor
 * pregazi prethodni (UNIQUE constraint + onConflict).
 */
export async function upsertClientExerciseSwap(
  clientId: string,
  fromExerciseId: string,
  toExerciseId: string,
): Promise<void> {
  const { error } = await supabase
    .from("client_exercise_swaps")
    .upsert(
      {
        client_id: clientId,
        from_exercise_id: fromExerciseId,
        to_exercise_id: toExerciseId,
      },
      { onConflict: "client_id,from_exercise_id" },
    );

  if (error) {
    throw new Error(
      `upsertClientExerciseSwap(${clientId}, ${fromExerciseId}) failed: ${error.message}`,
    );
  }
}

/** Briše trajnu zamenu za izvornu vežbu (vraća default algoritma). */
export async function removeClientExerciseSwap(
  clientId: string,
  fromExerciseId: string,
): Promise<void> {
  const { error } = await supabase
    .from("client_exercise_swaps")
    .delete()
    .eq("client_id", clientId)
    .eq("from_exercise_id", fromExerciseId);

  if (error) {
    throw new Error(
      `removeClientExerciseSwap(${clientId}, ${fromExerciseId}) failed: ${error.message}`,
    );
  }
}
