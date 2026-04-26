// ============================================================================
// messageService — chat CRUD + conversation aggregation
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export type SenderRole = "client" | "trainer";

export interface MessageRecord {
  id: string;
  clientId: string;
  trainerId: string;
  senderRole: SenderRole;
  body: string;
  readAtByClient: string | null;
  readAtByTrainer: string | null;
  attachmentUrl: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  client_id: string;
  trainer_id: string;
  sender_role: string;
  body: string;
  read_at_by_client: string | null;
  read_at_by_trainer: string | null;
  attachment_url: string | null;
  created_at: string;
}

function toRecord(row: Row): MessageRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    trainerId: row.trainer_id,
    senderRole: row.sender_role as SenderRole,
    body: row.body,
    readAtByClient: row.read_at_by_client,
    readAtByTrainer: row.read_at_by_trainer,
    attachmentUrl: row.attachment_url,
    createdAt: row.created_at,
  };
}

// ============================================================================
// List messages za jednu konverzaciju (po client_id)
// ============================================================================

export async function listMessages(clientId: string, limit = 100): Promise<MessageRecord[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`listMessages(${clientId}): ${error.message}`);
  return (data ?? []).map(toRecord);
}

// ============================================================================
// Send message
// ============================================================================

export interface SendMessageInput {
  clientId: string;
  trainerId: string;
  senderRole: SenderRole;
  body: string;
}

export async function sendMessage(input: SendMessageInput): Promise<MessageRecord> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      client_id: input.clientId,
      trainer_id: input.trainerId,
      sender_role: input.senderRole,
      body: input.body,
    })
    .select()
    .single();

  if (error) throw new Error(`sendMessage: ${error.message}`);
  return toRecord(data);
}

// ============================================================================
// Mark all messages as read (client side or trainer side)
// ============================================================================

export async function markRead(
  clientId: string,
  side: "client" | "trainer",
): Promise<void> {
  const column = side === "client" ? "read_at_by_client" : "read_at_by_trainer";
  const otherRole: SenderRole = side === "client" ? "trainer" : "client";
  const { error } = await supabase
    .from("messages")
    .update({ [column]: new Date().toISOString() })
    .eq("client_id", clientId)
    .eq("sender_role", otherRole)
    .is(column, null);

  if (error) throw new Error(`markRead(${clientId}, ${side}): ${error.message}`);
}

// ============================================================================
// List trainer conversations (group by client_id, most recent first)
// ============================================================================

export interface ConversationSummary {
  clientId: string;
  trainerId: string;
  clientFirstName: string | null;
  clientLastName: string | null;
  clientAvatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageRole: SenderRole | null;
  unreadCount: number;
}

export async function listTrainerConversations(
  trainerId: string,
): Promise<ConversationSummary[]> {
  // Učitaj sve klijente koji su trener — za sada svi role='client' u beta
  // (single-trainer model). Future: filter samo asignovanih klijenata.
  const { data: clients } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("role", "client");

  if (!clients) return [];

  // Paralelno fetch poslednju poruku + unread count po klijentu
  const summaries = await Promise.all(
    clients.map(async (c) => {
      const [lastMsgRes, unreadRes] = await Promise.all([
        supabase
          .from("messages")
          .select("body, sender_role, created_at")
          .eq("client_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("client_id", c.id)
          .eq("sender_role", "client")
          .is("read_at_by_trainer", null),
      ]);

      const lastMsg = lastMsgRes.data?.[0];
      return {
        clientId: c.id,
        trainerId,
        clientFirstName: c.first_name,
        clientLastName: c.last_name,
        clientAvatarUrl: c.avatar_url,
        lastMessage: lastMsg?.body ?? null,
        lastMessageAt: lastMsg?.created_at ?? null,
        lastMessageRole: (lastMsg?.sender_role as SenderRole) ?? null,
        unreadCount: unreadRes.count ?? 0,
      };
    }),
  );

  // Sort: unread first, then by lastMessageAt DESC
  summaries.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    if (a.lastMessageAt && b.lastMessageAt) {
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    }
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return 0;
  });

  return summaries;
}

// ============================================================================
// Find trainer for a client (single-trainer beta — vraća prvog trenera)
// ============================================================================

export async function findTrainerForClient(): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "trainer")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}
