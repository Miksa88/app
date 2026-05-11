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

/**
 * Pretražuje sve programe sa `default_for_<level>` tag-om za auto-assignment
 * pri client onboarding-u. Vraća prvi match (najsvežiji updated_at) ili null
 * ako trener nije obeležio nijedan program kao default za taj nivo.
 */
export async function findDefaultProgramForLevel(
  level: "beginner" | "intermediate" | "advanced",
): Promise<ProgramRecord | null> {
  const tag = `default_for_${level}`;
  const { data, error } = await supabase
    .from("programs")
    .select("*")
    .contains("tags", [tag])
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`findDefaultProgramForLevel: ${error.message}`);
  return data && data.length > 0 ? toRecord(data[0]) : null;
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

// ============================================================================
// W-8: Assign program to client(s) via client_template_assignments
// ============================================================================

export async function assignProgramToClients(
  programId: string,
  clientIds: string[],
): Promise<{ updated: number; missing: string[] }> {
  if (clientIds.length === 0) return { updated: 0, missing: [] };

  // Postojeći redovi (klijent je prošao onboarding)
  const { data: existing, error: existingErr } = await supabase
    .from("client_template_assignments")
    .select("client_id")
    .in("client_id", clientIds);
  if (existingErr) throw new Error(`assignProgramToClients(check): ${existingErr.message}`);

  const existingIds = new Set((existing ?? []).map(r => r.client_id));
  const missing = clientIds.filter(id => !existingIds.has(id));
  const updatable = clientIds.filter(id => existingIds.has(id));

  if (updatable.length === 0) return { updated: 0, missing };

  const { error: updateErr } = await supabase
    .from("client_template_assignments")
    .update({ assigned_program_id: programId })
    .in("client_id", updatable);
  if (updateErr) throw new Error(`assignProgramToClients(update): ${updateErr.message}`);

  return { updated: updatable.length, missing };
}

export async function listProgramAssignmentsForClient(
  clientId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("client_template_assignments")
    .select("assigned_program_id")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw new Error(`listProgramAssignmentsForClient: ${error.message}`);
  return data?.assigned_program_id ?? null;
}
