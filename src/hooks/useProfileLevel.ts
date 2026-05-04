// ============================================================================
// useProfileLevel — React Query hook za profiles.level (W-5 wire-up)
// ============================================================================
//
// Vraća numerički level klijentkinje iz profiles tabele. Default 1 ako null.
// Progress.tsx LEVELS lista koristi ovu vrednost da odredi koji level je
// `current` (highlight + progress bar).
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProfileLevel(clientId: string | null | undefined) {
  return useQuery<number, Error>({
    queryKey: ['profile', 'level', clientId ?? 'anon'],
    queryFn: async () => {
      if (!clientId) return 1;
      const { data, error } = await supabase
        .from('profiles')
        .select('level')
        .eq('id', clientId)
        .maybeSingle();

      if (error) throw new Error(`useProfileLevel: ${error.message}`);
      return data?.level ?? 1;
    },
    enabled: !!clientId,
    staleTime: 60 * 1000,
  });
}
