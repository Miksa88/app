// ============================================================================
// useClientNotes — React Query hooks za client_notes (W-3 finishing)
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listClientNotes,
  createClientNote,
  deleteClientNote,
  type ClientNoteRecord,
} from "@/services/clientNotesService";

export type { ClientNoteRecord } from "@/services/clientNotesService";

export function useClientNotes(clientId: string | null | undefined) {
  return useQuery<ClientNoteRecord[], Error>({
    queryKey: ["clientNotes", clientId ?? "anon"],
    queryFn: async () => (clientId ? listClientNotes(clientId) : []),
    enabled: !!clientId,
    staleTime: 30 * 1000,
  });
}

export function useCreateClientNote(clientId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<ClientNoteRecord, Error, string>({
    mutationFn: async (body: string) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");
      if (!clientId) throw new Error("clientId required");
      return createClientNote({ clientId, trainerId: user.id, body });
    },
    onSuccess: () => {
      if (clientId) qc.invalidateQueries({ queryKey: ["clientNotes", clientId] });
    },
  });
}

export function useDeleteClientNote(clientId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteClientNote,
    onSuccess: () => {
      if (clientId) qc.invalidateQueries({ queryKey: ["clientNotes", clientId] });
    },
  });
}
