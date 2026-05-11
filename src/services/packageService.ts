// ============================================================================
// packageService — CRUD i auto-assignment za tier package sistem
// Spec: roadmap Faza D
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PackageTier = Database["public"]["Enums"]["package_tier"];
export type PackageTargetExperience =
  Database["public"]["Enums"]["package_target_experience"];

export interface PackageFeatures {
  trainingProgram?: boolean;
  nutritionPlan?: boolean;
  weeklyCheckins?: boolean;
  directMessaging?: boolean;
  progressPhotos?: boolean;
  metricsTracking?: boolean;
  videoCalls?: boolean;
  videoCallFrequency?: number;
  /** Cena paketa (npr. 49.99). 0 ili undefined = besplatan. */
  priceAmount?: number;
  /** ISO valuta (npr. "EUR", "RSD", "USD"). Default "EUR" pri prikazu. */
  priceCurrency?: string;
  /** Trajanje paketa u danima (npr. 30 = mesec, 90 = 3 meseca, 365 = godina). */
  durationDays?: number;
}

export interface PackageRecord {
  id: string;
  trainerId: string;
  name: string;
  description: string | null;
  tier: PackageTier;
  features: PackageFeatures;
  programTemplateId: string | null;
  nutritionTemplateId: string | null;
  defaultWorkoutFrequency: number | null;
  targetExperience: PackageTargetExperience;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

type Row = Database["public"]["Tables"]["packages"]["Row"];

function toRecord(row: Row): PackageRecord {
  return {
    id: row.id,
    trainerId: row.trainer_id,
    name: row.name,
    description: row.description,
    tier: row.tier,
    features: (row.features as PackageFeatures) ?? {},
    programTemplateId: row.program_template_id,
    nutritionTemplateId: row.nutrition_template_id,
    defaultWorkoutFrequency: row.default_workout_frequency,
    targetExperience: row.target_experience,
    isActive: row.is_active,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// Read API
// ============================================================================

export async function listAllPackages(): Promise<PackageRecord[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .eq("is_archived", false)
    .order("tier", { ascending: true });

  if (error) throw new Error(`listAllPackages: ${error.message}`);
  return (data ?? []).map(toRecord);
}

export async function listTrainerPackages(trainerId: string): Promise<PackageRecord[]> {
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("is_archived", false)
    .order("tier", { ascending: true });

  if (error) throw new Error(`listTrainerPackages(${trainerId}): ${error.message}`);
  return (data ?? []).map(toRecord);
}

export async function getPackageById(id: string): Promise<PackageRecord | null> {
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getPackageById(${id}): ${error.message}`);
  return data ? toRecord(data) : null;
}

// ============================================================================
// Write API
// ============================================================================

export interface CreatePackageInput {
  trainerId: string;
  name: string;
  description?: string;
  tier: PackageTier;
  features?: PackageFeatures;
  programTemplateId?: string;
  nutritionTemplateId?: string;
  defaultWorkoutFrequency?: number;
  targetExperience?: PackageTargetExperience;
}

export async function createPackage(input: CreatePackageInput): Promise<PackageRecord> {
  const { data, error } = await supabase
    .from("packages")
    .insert({
      trainer_id: input.trainerId,
      name: input.name,
      description: input.description ?? null,
      tier: input.tier,
      features: (input.features ?? {}) as Database["public"]["Tables"]["packages"]["Insert"]["features"],
      program_template_id: input.programTemplateId ?? null,
      nutrition_template_id: input.nutritionTemplateId ?? null,
      default_workout_frequency: input.defaultWorkoutFrequency ?? null,
      target_experience: input.targetExperience ?? "any",
    })
    .select()
    .single();

  if (error) throw new Error(`createPackage: ${error.message}`);
  return toRecord(data);
}

export async function updatePackage(
  id: string,
  patch: Partial<Omit<PackageRecord, "id" | "trainerId" | "createdAt" | "updatedAt">>,
): Promise<PackageRecord> {
  const updateRow: Database["public"]["Tables"]["packages"]["Update"] = {};
  if (patch.name !== undefined) updateRow.name = patch.name;
  if (patch.description !== undefined) updateRow.description = patch.description;
  if (patch.tier !== undefined) updateRow.tier = patch.tier;
  if (patch.features !== undefined) {
    updateRow.features = patch.features as Database["public"]["Tables"]["packages"]["Update"]["features"];
  }
  if (patch.programTemplateId !== undefined) updateRow.program_template_id = patch.programTemplateId;
  if (patch.nutritionTemplateId !== undefined) updateRow.nutrition_template_id = patch.nutritionTemplateId;
  if (patch.defaultWorkoutFrequency !== undefined) {
    updateRow.default_workout_frequency = patch.defaultWorkoutFrequency;
  }
  if (patch.targetExperience !== undefined) updateRow.target_experience = patch.targetExperience;
  if (patch.isActive !== undefined) updateRow.is_active = patch.isActive;
  if (patch.isArchived !== undefined) updateRow.is_archived = patch.isArchived;

  const { data, error } = await supabase
    .from("packages")
    .update(updateRow)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`updatePackage(${id}): ${error.message}`);
  return toRecord(data);
}

export async function archivePackage(id: string): Promise<void> {
  const { error } = await supabase
    .from("packages")
    .update({ is_archived: true, is_active: false })
    .eq("id", id);
  if (error) throw new Error(`archivePackage(${id}): ${error.message}`);
}

/** Reverts archivePackage (Undo). Restores is_archived=false + is_active=true. */
export async function unarchivePackage(id: string): Promise<void> {
  const { error } = await supabase
    .from("packages")
    .update({ is_archived: false, is_active: true })
    .eq("id", id);
  if (error) throw new Error(`unarchivePackage(${id}): ${error.message}`);
}

// ============================================================================
// Auto-assignment — bira najbolji entry/mid paket za novog klijenta
// ============================================================================
//
// Logika (Faza D minimum):
//   1. Filter: target_experience matchuje (beginner ili 'any' za pocetnice;
//      intermediate ili 'any' za srednje napredne)
//   2. Filter: default_workout_frequency matchuje ili je null (no preference)
//   3. Prioritet: tier 'mid' iznad 'entry' ako postoji match (više vrednosti
//      za korisnika), ali nikad 'high' (high zahteva trainer manual approval)
//   4. Među match-evima, najnoviji (created_at DESC)
//
// Vraća null ako nema match-a — fallback na default algoritam plan
// (postojeća logika u onboardingService.completeOnboarding)
// ============================================================================

export interface AutoAssignmentInput {
  experienceLevel: "beginner" | "intermediate";
  workoutFrequency: 3 | 4 | 5;
}

export async function findAutoAssignmentPackage(
  input: AutoAssignmentInput,
): Promise<PackageRecord | null> {
  const allPackages = await listAllPackages();
  const candidates = allPackages.filter(p => {
    if (p.tier === "high") return false;
    if (p.targetExperience !== "any" && p.targetExperience !== input.experienceLevel) {
      return false;
    }
    if (p.defaultWorkoutFrequency !== null && p.defaultWorkoutFrequency !== input.workoutFrequency) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  // Prefer 'mid' tier, then 'entry'
  const midCandidates = candidates.filter(p => p.tier === "mid");
  const pool = midCandidates.length > 0 ? midCandidates : candidates;
  pool.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return pool[0];
}

// ============================================================================
// Client tier assignment (profiles.assigned_*)
// ============================================================================

export async function assignPackageToClient(
  clientId: string,
  packageId: string | null,
  tier: PackageTier | null,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      assigned_package_id: packageId,
      assigned_tier: tier,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", clientId);
  if (error) throw new Error(`assignPackageToClient(${clientId}): ${error.message}`);
}
