// ============================================================================
// clientNotesService — CRUD za client_notes (W-3 finishing)
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["client_notes"]["Row"];

export interface ClientNoteRecord {
  id: string;
  clientId: string;
  trainerId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

function toRecord(row: Row): ClientNoteRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    trainerId: row.trainer_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listClientNotes(clientId: string): Promise<ClientNoteRecord[]> {
  const { data, error } = await supabase
    .from("client_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listClientNotes: ${error.message}`);
  return (data ?? []).map(toRecord);
}

export async function createClientNote(input: {
  clientId: string;
  trainerId: string;
  body: string;
}): Promise<ClientNoteRecord> {
  const { data, error } = await supabase
    .from("client_notes")
    .insert({
      client_id: input.clientId,
      trainer_id: input.trainerId,
      body: input.body,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createClientNote: ${error.message}`);
  return toRecord(data);
}

export async function deleteClientNote(id: string): Promise<void> {
  const { error } = await supabase.from("client_notes").delete().eq("id", id);
  if (error) throw new Error(`deleteClientNote: ${error.message}`);
}
