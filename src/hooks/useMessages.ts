// ============================================================================
// useMessages — Realtime chat hook za jednog klijenta
// ============================================================================

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listMessages,
  markRead,
  sendMessage as sendMessageService,
  type MessageRecord,
  type SenderRole,
} from "@/services/messageService";

export interface UseMessagesResult {
  messages: MessageRecord[];
  isLoading: boolean;
  send: (body: string) => Promise<void>;
}

export function useMessages(
  clientId: string | null,
  trainerId: string | null,
  selfRole: SenderRole,
): UseMessagesResult {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(clientId !== null);

  useEffect(() => {
    if (!clientId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      try {
        const list = await listMessages(clientId);
        if (cancelled) return;
        setMessages(list);
        // Mark read on initial load
        await markRead(clientId, selfRole).catch(() => undefined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${clientId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `client_id=eq.${clientId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const row = payload.new as {
            id: string;
            client_id: string;
            trainer_id: string;
            sender_role: string;
            body: string;
            read_at_by_client: string | null;
            read_at_by_trainer: string | null;
            attachment_url: string | null;
            created_at: string;
          };
          setMessages((prev) => {
            // Skip duplicates (može da stigne pre lokalnog response-a)
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              ...prev,
              {
                id: row.id,
                clientId: row.client_id,
                trainerId: row.trainer_id,
                senderRole: row.sender_role as SenderRole,
                body: row.body,
                readAtByClient: row.read_at_by_client,
                readAtByTrainer: row.read_at_by_trainer,
                attachmentUrl: row.attachment_url,
                createdAt: row.created_at,
              },
            ];
          });
          // Mark read u real-time-u ako poruka stigne dok je chat otvoren
          void markRead(clientId, selfRole).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [clientId, selfRole]);

  const send = useCallback(
    async (body: string): Promise<void> => {
      if (!clientId || !trainerId || !body.trim()) return;
      const trimmed = body.trim();
      await sendMessageService({
        clientId,
        trainerId,
        senderRole: selfRole,
        body: trimmed,
      });
      // Realtime će ubaciti poruku u state — ne dodajemo lokalno da bismo
      // izbegli duplo prikazivanje.
    },
    [clientId, trainerId, selfRole],
  );

  return { messages, isLoading, send };
}
