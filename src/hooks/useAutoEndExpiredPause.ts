// ============================================================================
// useAutoEndExpiredPause — auto-resume istekle pauze pri učitavanju Home-a
// MVP_PRESET gap #1 (Pause/Freeze)
// ============================================================================
//
// Kad PausedClientBanner učita pause_state sa pause_until u prošlosti:
//   1. Pozovi end-pause EF (gasi pause_events red + activePauseEvent +
//      čisti profiles.pause_state mirror; illness → re-entry deload flag).
//   2. Ako end-pause javi "nema aktivne pauze" (trener-pauza bez pause_events
//      reda) → fallback: resumeClient() čisti samo profiles.pause_state.
//   3. Invalidate clientPause + userStatus cache → banner nestaje.
//
// Pattern: pure orkestrator (runAutoEndExpiredPause) odvojen od React
// wrappera radi testiranja bez QueryClientProvider-a.
// ============================================================================

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  isPauseExpired,
  resumeClient,
  type PauseState,
} from "@/services/clientPauseService";

export interface AutoEndExpiredPauseDeps {
  /** end-pause Edge Function poziv (klijent-inicirana pauza). */
  endPause: (clientId: string) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
  /** Direktan clear profiles.pause_state (fallback za trener-pauzu bez pause_events reda). */
  resumeClient: (clientId: string) => Promise<void>;
}

function defaultDeps(): AutoEndExpiredPauseDeps {
  return {
    endPause: (clientId) =>
      supabase.functions.invoke("end-pause", { body: { clientId } }),
    resumeClient,
  };
}

/**
 * Pure orkestrator. Vraca true ako je pauza zavrsena (bila istekla), false
 * ako nije bilo nista za raditi.
 */
export async function runAutoEndExpiredPause(
  clientId: string,
  state: PauseState | null,
  deps: AutoEndExpiredPauseDeps,
): Promise<boolean> {
  if (!isPauseExpired(state)) return false;

  try {
    const { data, error } = await deps.endPause(clientId);
    if (error) throw new Error(error.message ?? "end-pause failed");
    const payload = data as { ok?: boolean } | null;
    if (!payload?.ok) {
      // end-pause vratio ok:false (npr. "Nema aktivne pauze") —
      // trener-pauza bez pause_events reda → ocisti samo pause_state.
      await deps.resumeClient(clientId);
    }
  } catch {
    // EF nedostupan/404 — fallback na direktni pause_state clear,
    // banner ne sme da ostane zauvek.
    await deps.resumeClient(clientId);
  }
  return true;
}

/**
 * React hook: pri svakom učitavanju pause state-a proverava istek i
 * automatski završava isteklu pauzu (jednom po mount-u/state promeni).
 */
export function useAutoEndExpiredPause(
  clientId: string | null | undefined,
  pauseState: PauseState | null | undefined,
  deps?: AutoEndExpiredPauseDeps,
): void {
  const queryClient = useQueryClient();
  // Guard: spreci duple pozive dok invalidacija ne stigne
  const inFlightRef = useRef(false);
  const resolvedDeps = deps ?? defaultDeps();

  useEffect(() => {
    if (!clientId || !pauseState) return;
    if (!isPauseExpired(pauseState)) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    runAutoEndExpiredPause(clientId, pauseState, resolvedDeps)
      .then((ended) => {
        if (ended) {
          queryClient.invalidateQueries({ queryKey: ["clientPause", clientId] });
          queryClient.invalidateQueries({ queryKey: ["userStatus", clientId] });
        }
      })
      .catch(() => {
        // Tiho: sledeci mount/refetch pokusava ponovo
      })
      .finally(() => {
        inFlightRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, pauseState?.pause_until, pauseState?.paused_at]);
}
