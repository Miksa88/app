// ============================================================================
// programService — CRUD za programs tabelu (W-2 wire-up)
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Program, ProgramDay } from "@/data/trainingMockData";

type Row = Database["public"]["Tables"]["programs"]["Row"];

export interface ProgramRecord {
  id: string;
  trainerId: string;
  name: string;
  description: string | null;
  type: Program["type"];
  tags: string[];
  workoutDays: ProgramDay[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

function toRecord(row: Row): ProgramRecord {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    name: row.name,
    description: row.description,
    type: (row.type as Program["type"]) ?? "fixed",
    tags: row.tags ?? [],
    workoutDays: (row.workout_days as unknown as ProgramDay[]) ?? [],
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTrainerPrograms(trainerId: string): Promise<ProgramRecord[]> {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listTrainerPrograms: ${error.message}`);
  return (data ?? []).map(toRecord);
}

export async function getProgramById(id: string): Promise<ProgramRecord | null> {
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProgramById: ${error.message}`);
  return data ? toRecord(data) : null;
}

export interface UpsertProgramInput {
  id?: string;
  trainerId: string;
  name: string;
  description?: string | null;
  type: Program["type"];
  tags: string[];
  workoutDays: ProgramDay[];
}

export async function upsertProgram(input: UpsertProgramInput): Promise<ProgramRecord> {
  const payload = {
    trainer_id: input.trainerId,
    name: input.name,
    description: input.description ?? null,
    type: input.type,
    tags: input.tags,
    workout_days: input.workoutDays as unknown as Database["public"]["Tables"]["programs"]["Insert"]["workout_days"],
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("programs")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(`upsertProgram(update): ${error.message}`);
    return toRecord(data);
  }
  const { data, error } = await supabase
    .from("programs")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`upsertProgram(insert): ${error.message}`);
  return toRecord(data);
}

export async function archiveProgram(id: string): Promise<void> {
  const { error } = await supabase
    .from("programs")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) throw new Error(`archiveProgram: ${error.message}`);
}
