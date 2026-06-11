// ============================================================================
// useRecentWeightAvg — prosek težine poslednja 3 dana (WeeklyCheckIn prefill)
// ============================================================================

import { useQuery } from "@tanstack/react-query";
import { getRecentWeightAvgKg } from "@/services/progressService";

export function useRecentWeightAvg(clientId: string | null | undefined) {
  return useQuery<number | null, Error>({
    queryKey: ["recentWeightAvg", clientId ?? "anon"],
    queryFn: async () => (clientId ? getRecentWeightAvgKg(clientId) : null),
    enabled: !!clientId,
    retry: false, // prefill je nice-to-have — silent fail, bez retry šuma
  });
}
