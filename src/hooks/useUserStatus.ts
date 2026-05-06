// ============================================================================
// useUserStatus — primary React hook za UserStatus + Realtime subscription
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6 (Frontend mapping)
// ============================================================================
//
// Strategija:
//   1. Initial load kroz loadUserStatus
//   2. Supabase Realtime subscription na user_status WHERE client_id=me
//   3. Posle svake DB mutacije (od strane sync engine-a), Realtime push okida
//      reload pa setState — UI re-renderuje automatski
//
// IMPORTANT: ovaj hook se koristi u svim ekranima koji prikazuju calorie
// target / queue / banner-e. Realtime subscription je jedan po `clientId`.
// ============================================================================

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadUserStatus } from '@/utils/db/userStatus';
import type { UserStatus } from '@/types/userStatus';

export interface UseUserStatusResult {
  status: UserStatus | null;
  isLoading: boolean;
  error: Error | null;
  /** Manuelni refresh — koristi se posle UI akcija koje nisu prošle kroz Realtime */
  refetch: () => Promise<void>;
}

export function useUserStatus(clientId: string | null): UseUserStatusResult {
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(clientId !== null);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = async (id: string): Promise<void> => {
    try {
      const s = await loadUserStatus(id);
      setStatus(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) {
      setStatus(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    // Initial fetch
    fetchStatus(clientId).then(() => {
      if (!isMounted) setStatus(null);  // ignore if component unmounted mid-fetch
    });

    // Realtime subscription
    // Note: Postgres Changes filter format: column=op.value
    const channel = supabase
      .channel(`user_status:${clientId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'user_status',
          filter: `client_id=eq.${clientId}`,
        },
        async () => {
          if (!isMounted) return;
          // Re-fetch full row (payload sadrzi diff; lakse je da reload-ujemo
          // i deserialize-ujemo kroz isti pipeline kao initial load)
          await fetchStatus(clientId);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  return {
    status,
    isLoading,
    error,
    refetch: async () => {
      if (clientId) await fetchStatus(clientId);
    },
  };
}
