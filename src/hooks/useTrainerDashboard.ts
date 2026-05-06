// ============================================================================
// useTrainerDashboard + useAtRiskClients — React hooks za trener dashboard
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.2
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  getDashboardCounters,
  getAtRiskClients,
  type AtRiskClientSummary,
  type TrainerDashboardCounters,
} from '@/services/trainerService';

export interface UseTrainerDashboardResult {
  counters: TrainerDashboardCounters | null;
  atRiskClients: AtRiskClientSummary[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTrainerDashboard(): UseTrainerDashboardResult {
  const [counters, setCounters] = useState<TrainerDashboardCounters | null>(null);
  const [atRiskClients, setAtRiskClients] = useState<AtRiskClientSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [c, atRisk] = await Promise.all([
        getDashboardCounters(),
        getAtRiskClients(),
      ]);
      setCounters(c);
      setAtRiskClients(atRisk);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { counters, atRiskClients, isLoading, error, refetch: fetchAll };
}
