// ============================================================================
// useClientPause — read + pause + resume klijenta (trener-side)
// V3 §10
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPauseState,
  pauseClient,
  resumeClient,
  type PauseState,
} from "@/services/clientPauseService";

const KEY = (clientId: string | null | undefined) => [
  "clientPause",
  clientId ?? "anon",
];

export function useClientPause(clientId: string | null | undefined) {
  return useQuery<PauseState | null, Error>({
    queryKey: KEY(clientId),
    queryFn: () => {
      if (!clientId) return Promise.resolve(null);
      return getPauseState(clientId);
    },
    enabled: !!clientId,
    staleTime: 30 * 1000,
  });
}

export interface PauseClientArgs {
  trainerId: string;
  pauseUntil: string | null;
  reason: string | null;
}

export function usePauseClient(clientId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<PauseState, Error, PauseClientArgs>({
    mutationFn: ({ trainerId, pauseUntil, reason }) => {
      if (!clientId) throw new Error("clientId required");
      return pauseClient(clientId, trainerId, pauseUntil, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(clientId) });
    },
  });
}

export function useResumeClient(clientId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => {
      if (!clientId) throw new Error("clientId required");
      return resumeClient(clientId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(clientId) });
    },
  });
}
