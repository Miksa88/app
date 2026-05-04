// ============================================================================
// usePackages — React Query hook za packages tabelu (W-4 wire-up)
// ============================================================================
//
// Učitava trenerove pakete iz Supabase `packages` tabele preko
// `listTrainerPackages(trainerId)`. Zamenjuje statički MOCK_PACKAGES import
// na TrainerDashboard-u i bilo koji drugi screen koji prikazuje paket count.
//
// Trener bez auth-a → prazna lista (umesto error-a) da Dashboard ne razbije
// pre login-a.
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import {
  listTrainerPackages,
  type PackageRecord,
} from '@/services/packageService';
import { useAuth } from '@/contexts/AuthContext';

export function usePackages() {
  const { user } = useAuth();
  const trainerId = user?.id ?? null;

  return useQuery<PackageRecord[], Error>({
    queryKey: ['packages', 'trainer', trainerId ?? 'anon'],
    queryFn: async () => {
      if (!trainerId) return [];
      return listTrainerPackages(trainerId);
    },
    enabled: !!trainerId,
    staleTime: 60 * 1000,
  });
}
