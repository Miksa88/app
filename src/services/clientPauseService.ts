// ============================================================================
// clientPauseService — trener Pause/Freeze klijenta
// V3 §10 — "Pause/Freeze klijenta — Saved client = saved revenue"
// ============================================================================
//
// Persists na profiles.pause_state JSONB:
//   { paused_at: ISO timestamp, pause_until: YYYY-MM-DD | null,
//     reason: string | null, paused_by_trainer_id: uuid }
// pause_state === null  =>  klijent aktivan.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface PauseState {
  paused_at: string;
  pause_until: string | null;
  reason: string | null;
  paused_by_trainer_id: string | null;
}

export async function getPauseState(clientId: string): Promise<PauseState | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("pause_state")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("column") && error.message.includes("does not exist")) {
      return null;
    }
    throw new Error(`getPauseState(${clientId}) failed: ${error.message}`);
  }
  const raw = data?.pause_state as PauseState | null;
  if (!raw || typeof raw !== "object" || !raw.paused_at) return null;
  return raw;
}

export async function pauseClient(
  clientId: string,
  trainerId: string,
  pauseUntil: string | null,
  reason: string | null,
): Promise<PauseState> {
  const state: PauseState = {
    paused_at: new Date().toISOString(),
    pause_until: pauseUntil,
    reason: reason?.trim() || null,
    paused_by_trainer_id: trainerId,
  };
  const { error } = await supabase
    .from("profiles")
    .update({ pause_state: state as unknown as Json })
    .eq("id", clientId);

  if (error) {
    throw new Error(`pauseClient(${clientId}) failed: ${error.message}`);
  }
  return state;
}

export async function resumeClient(clientId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ pause_state: null })
    .eq("id", clientId);

  if (error) {
    throw new Error(`resumeClient(${clientId}) failed: ${error.message}`);
  }
}

/**
 * Pomocna: vraca true ako pauza istekla (pause_until je u proslosti).
 * Frontend moze da automatski "resume" expired pauzu.
 */
export function isPauseExpired(state: PauseState | null): boolean {
  if (!state || !state.pause_until) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(state.pause_until) < now;
}
