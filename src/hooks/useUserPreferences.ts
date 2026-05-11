// ============================================================================
// useUserPreferences — notif prefs + units (per-user, self-managed)
// V3 §6 + §14
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_UNITS,
  getNotificationPreferences,
  getPreferredUnits,
  setNotificationPreferences,
  setPreferredUnits,
  type NotificationPreferences,
  type PreferredUnits,
} from "@/services/userPreferencesService";

const NOTIF_KEY = (userId: string | null | undefined) => [
  "notifPrefs",
  userId ?? "anon",
];
const UNITS_KEY = (userId: string | null | undefined) => [
  "preferredUnits",
  userId ?? "anon",
];

export function useNotificationPreferences(userId: string | null | undefined) {
  return useQuery<NotificationPreferences, Error>({
    queryKey: NOTIF_KEY(userId),
    queryFn: () => {
      if (!userId) return Promise.resolve(DEFAULT_NOTIFICATION_PREFERENCES);
      return getNotificationPreferences(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSetNotificationPreferences(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, NotificationPreferences>({
    mutationFn: (prefs) => {
      if (!userId) throw new Error("userId required");
      return setNotificationPreferences(userId, prefs);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIF_KEY(userId) });
    },
  });
}

export function usePreferredUnits(userId: string | null | undefined) {
  return useQuery<PreferredUnits, Error>({
    queryKey: UNITS_KEY(userId),
    queryFn: () => {
      if (!userId) return Promise.resolve(DEFAULT_UNITS);
      return getPreferredUnits(userId);
    },
    enabled: !!userId,
    staleTime: 60 * 60 * 1000,
  });
}

export function useSetPreferredUnits(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, PreferredUnits>({
    mutationFn: (units) => {
      if (!userId) throw new Error("userId required");
      return setPreferredUnits(userId, units);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: UNITS_KEY(userId) });
    },
  });
}
