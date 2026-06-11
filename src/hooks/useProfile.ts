// ============================================================================
// useProfile — React Query hooks za profiles tabelu (whitelabel Task 1.1)
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import {
  getProfileRole,
  getProfileInjuries,
  getClientTier,
  getTrainerClientCard,
} from "@/services/profileService";
import type { ClientData } from "@/data/trainerMockData";
import type { PackageTier } from "@/services/packageService";

/** Rola korisnika — ProtectedRoute guard. */
export function useProfileRole(clientId: string | null | undefined, enabled: boolean) {
  return useQuery<string | null, Error>({
    queryKey: ["profile", "role", clientId ?? "anon"],
    queryFn: async () => (clientId ? getProfileRole(clientId) : null),
    enabled: !!clientId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Povrede iz profila — ActiveWorkout surgical swap. */
export function useProfileInjuries(clientId: string | null | undefined) {
  return useQuery<string[], Error>({
    queryKey: ["profile", "injuries", clientId ?? "anon"],
    queryFn: async () => (clientId ? getProfileInjuries(clientId) : []),
    enabled: !!clientId,
  });
}

/** Dodeljeni paket-tier — trener ClientProfile. */
export function useClientTier(clientId: string | null | undefined) {
  return useQuery<PackageTier | null, Error>({
    queryKey: ["profile", "tier", clientId ?? "anon"],
    queryFn: async () => (clientId ? getClientTier(clientId) : null),
    enabled: !!clientId,
  });
}

/** ClientData kartica iz profiles — trener ClientProfile. */
export function useTrainerClientCard(clientId: string | null | undefined) {
  return useQuery<ClientData | null, Error>({
    queryKey: ["profile", "trainerClientCard", clientId ?? "anon"],
    queryFn: async () => (clientId ? getTrainerClientCard(clientId) : null),
    enabled: !!clientId,
  });
}
