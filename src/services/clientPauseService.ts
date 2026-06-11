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

// ============================================================================
// Klijent-inicirana pauza — trajanje (MVP_PRESET gap #1)
// ============================================================================

/** Maksimalno trajanje klijent-inicirane pauze (mirror server-side guard-a u start-pause EF). */
export const MAX_CLIENT_PAUSE_DAYS = 30;

/** Preset trajanja koje klijentkinja bira u QuickPauseSheet-u. */
export const PAUSE_DURATION_PRESETS = [7, 14, 21] as const;

/**
 * Racuna pause_until (YYYY-MM-DD) za izabrano trajanje u danima.
 * Vraca null za "dok se ne vratim" (days = null) — indefinitivna pauza.
 * Throw-uje za nevalidan broj dana (van 1..MAX_CLIENT_PAUSE_DAYS).
 */
export function computePauseUntil(
  days: number | null,
  from: Date = new Date(),
): string | null {
  if (days === null) return null;
  if (!Number.isInteger(days) || days < 1 || days > MAX_CLIENT_PAUSE_DAYS) {
    throw new Error(
      `computePauseUntil: days mora biti 1..${MAX_CLIENT_PAUSE_DAYS}, dobio ${days}`,
    );
  }
  const until = new Date(from);
  until.setDate(until.getDate() + days);
  const yyyy = until.getFullYear();
  const mm = String(until.getMonth() + 1).padStart(2, "0");
  const dd = String(until.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
