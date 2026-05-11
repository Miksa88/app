// ============================================================================
// useClientEquipment — read + write trener-managed equipment list
// V3 §10
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getClientEquipment,
  setClientEquipment,
} from "@/services/clientEquipmentService";

const KEY = (clientId: string | null | undefined) => [
  "clientEquipment",
  clientId ?? "anon",
];

export function useClientEquipment(clientId: string | null | undefined) {
  return useQuery<string[], Error>({
    queryKey: KEY(clientId),
    queryFn: () => {
      if (!clientId) return Promise.resolve([]);
      return getClientEquipment(clientId);
    },
    enabled: !!clientId,
    staleTime: 60 * 1000,
  });
}

export function useSetClientEquipment(clientId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, string[]>({
    mutationFn: (equipment) => {
      if (!clientId) throw new Error("clientId required");
      return setClientEquipment(clientId, equipment);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY(clientId) });
    },
  });
}
