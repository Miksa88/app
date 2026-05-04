// ============================================================================
// useTrialSettings — read+update trener trial config (P0-3)
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTrialSettings,
  setTrialSettings,
  DEFAULT_TRIAL_SETTINGS,
  type TrialSettings,
} from "@/services/trialSettingsService";

export type { TrialSettings } from "@/services/trialSettingsService";
export { DEFAULT_TRIAL_SETTINGS } from "@/services/trialSettingsService";

const KEY = ["trialSettings"] as const;

export function useTrialSettings() {
  const { user } = useAuth();
  const trainerId = user?.id ?? null;

  return useQuery<TrialSettings, Error>({
    queryKey: [...KEY, trainerId ?? "anon"],
    queryFn: async () =>
      trainerId ? getTrialSettings(trainerId) : DEFAULT_TRIAL_SETTINGS,
    enabled: !!trainerId,
    staleTime: 60 * 1000,
  });
}

export function useSetTrialSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<void, Error, TrialSettings>({
    mutationFn: async (settings) => {
      if (!user?.id) throw new Error("Not authenticated");
      return setTrialSettings(user.id, settings);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
