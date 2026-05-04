// ============================================================================
// useWorkouts — React Query hooks za trainer workouts (W-2 wire-up)
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  listTrainerWorkouts,
  getWorkoutById,
  upsertWorkout,
  archiveWorkout,
  type WorkoutRecord,
  type UpsertWorkoutInput,
} from "@/services/trainerWorkoutService";

export type { WorkoutRecord } from "@/services/trainerWorkoutService";

const KEY = ["workouts", "trainer"] as const;

export function useWorkouts() {
  const { user } = useAuth();
  const trainerId = user?.id ?? null;

  return useQuery<WorkoutRecord[], Error>({
    queryKey: [...KEY, trainerId ?? "anon"],
    queryFn: async () => (trainerId ? listTrainerWorkouts(trainerId) : []),
    enabled: !!trainerId,
    staleTime: 30 * 1000,
  });
}

export function useWorkout(id: string | null | undefined) {
  return useQuery<WorkoutRecord | null, Error>({
    queryKey: ["workouts", "byId", id ?? "none"],
    queryFn: async () => (id ? getWorkoutById(id) : null),
    enabled: !!id && id !== "new",
    staleTime: 30 * 1000,
  });
}

export function useUpsertWorkout() {
  const qc = useQueryClient();
  return useMutation<WorkoutRecord, Error, Omit<UpsertWorkoutInput, "trainerId">>({
    mutationFn: async (input) => {
      const { user } = await import("@/integrations/supabase/client").then(
        async ({ supabase }) => ({ user: (await supabase.auth.getUser()).data.user }),
      );
      if (!user?.id) throw new Error("Not authenticated");
      return upsertWorkout({ ...input, trainerId: user.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useArchiveWorkout() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: archiveWorkout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
