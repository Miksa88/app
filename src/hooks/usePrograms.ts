// ============================================================================
// usePrograms — React Query hooks za trainer programs (W-2 wire-up)
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  listTrainerPrograms,
  getProgramById,
  upsertProgram,
  archiveProgram,
  assignProgramToClients,
  type ProgramRecord,
  type UpsertProgramInput,
} from "@/services/programService";

export type { ProgramRecord } from "@/services/programService";

const KEY = ["programs", "trainer"] as const;

export function usePrograms() {
  const { user } = useAuth();
  const trainerId = user?.id ?? null;

  return useQuery<ProgramRecord[], Error>({
    queryKey: [...KEY, trainerId ?? "anon"],
    queryFn: async () => (trainerId ? listTrainerPrograms(trainerId) : []),
    enabled: !!trainerId,
    staleTime: 30 * 1000,
  });
}

export function useProgram(id: string | null | undefined) {
  return useQuery<ProgramRecord | null, Error>({
    queryKey: ["programs", "byId", id ?? "none"],
    queryFn: async () => (id ? getProgramById(id) : null),
    enabled: !!id && id !== "new",
    staleTime: 30 * 1000,
  });
}

export function useUpsertProgram() {
  const qc = useQueryClient();
  return useMutation<ProgramRecord, Error, Omit<UpsertProgramInput, "trainerId">>({
    mutationFn: async (input) => {
      const { user } = await import("@/integrations/supabase/client").then(
        async ({ supabase }) => ({ user: (await supabase.auth.getUser()).data.user }),
      );
      if (!user?.id) throw new Error("Not authenticated");
      return upsertProgram({ ...input, trainerId: user.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useArchiveProgram() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: archiveProgram,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useAssignProgramToClients() {
  const qc = useQueryClient();
  return useMutation<
    { updated: number; missing: string[] },
    Error,
    { programId: string; clientIds: string[] }
  >({
    mutationFn: ({ programId, clientIds }) => assignProgramToClients(programId, clientIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainerClients"] });
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
