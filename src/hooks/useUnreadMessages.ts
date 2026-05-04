// ============================================================================
// useUnreadMessages — broj nepročitanih poruka za klijentkinju (P2 polish)
// ============================================================================
//
// Brojač poruka koje je trener poslao a klijentkinja još nije pročitala.
// Read-state: messages.read_at_by_client IS NULL i sender_role='trainer'.
// ============================================================================

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadMessages(clientId: string | null | undefined) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!clientId) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("sender_role", "trainer")
        .is("read_at_by_client", null);
      if (!cancelled) setCount(c ?? 0);
    };

    void fetchCount();

    // Realtime updates: kad nova poruka dođe, refetch
    const channel = supabase
      .channel(`messages_unread:${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          void fetchCount();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [clientId]);

  return count;
}
