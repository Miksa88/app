// ============================================================================
// useTrainerClients — pun spisak klijentkinja za TrainerClients/Dashboard
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { getAllClients, type ClientListItem } from '@/services/trainerService';

export interface UseTrainerClientsResult {
  clients: ClientListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTrainerClients(): UseTrainerClientsResult {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await getAllClients();
      setClients(list);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { clients, isLoading, error, refetch: fetchAll };
}
