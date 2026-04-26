// ============================================================================
// useDailyTotals — danas konzumirane kcal/macros iz meal_logs
// ============================================================================

import { useEffect, useState } from 'react';
import { getDailyTotals, type DailyTotals } from '@/services/mealLogService';

export interface UseDailyTotalsResult {
  totals: DailyTotals | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDailyTotals(clientId: string | null): UseDailyTotalsResult {
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(clientId !== null);
  const [error, setError] = useState<Error | null>(null);

  const fetchTotals = async (id: string) => {
    setIsLoading(true);
    try {
      const t = await getDailyTotals(id);
      setTotals(t);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) {
      setTotals(null);
      setIsLoading(false);
      return;
    }
    void fetchTotals(clientId);
  }, [clientId]);

  return {
    totals,
    isLoading,
    error,
    refetch: async () => {
      if (clientId) await fetchTotals(clientId);
    },
  };
}
