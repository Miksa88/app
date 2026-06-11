// ============================================================================
// profileService — čitanje/upis `profiles` tabele (whitelabel Task 1.1)
// ============================================================================
//
// Centralizuje sve direktne supabase pozive ka `profiles` koji su ranije
// živeli po stranicama/komponentama. UI sloj ide isključivo preko ovih
// funkcija + React Query hook-ova.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { ClientData } from "@/data/trainerMockData";
import type { PackageTier } from "@/services/packageService";

/** Rola korisnika (client | trainer) — koristi ProtectedRoute guard. */
export async function getProfileRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role ?? null;
}

/** Povrede iz onboarding-a — koristi ActiveWorkout za surgical swap. */
export async function getProfileInjuries(clientId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("injuries")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(`getProfileInjuries: ${error.message}`);
  return data?.injuries ?? [];
}

/** Dodeljeni paket-tier klijentkinje — koristi trener ClientProfile. */
export async function getClientTier(clientId: string): Promise<PackageTier | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("assigned_tier")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(`getClientTier: ${error.message}`);
  return (data?.assigned_tier as PackageTier | null) ?? null;
}

/**
 * Kartica klijentkinje za trener ClientProfile — mapira `profiles` red u
 * ClientData shape (legacy mock tip, polja koja ne postoje u DB su default).
 */
export async function getTrainerClientCard(clientId: string): Promise<ClientData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, avatar_url, current_weight, height, date_of_birth, allergies, food_dislikes, injuries, sleep_hours_avg, stress_level, job_type, work_schedule, primary_goal, metabolic_conditions")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw new Error(`getTrainerClientCard: ${error.message}`);
  if (!data) return null;

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim()
    || data.email?.split("@")[0]
    || "Client";

  return {
    id: data.id,
    name: fullName,
    email: data.email ?? "",
    avatar: data.avatar_url,
    status: "active",
    type: "online",
    startDate: new Date().toISOString().split("T")[0],
    endDate: null,
    pausedAt: null,
    programWeek: 0,
    programTotalWeeks: 12,
    trialDaysTotal: 7,
    trialDaysRemaining: 0,
    dateOfBirth: data.date_of_birth ?? "2000-01-01",
    weight: data.current_weight ?? 0,
    height: data.height ?? 0,
    goals: data.primary_goal ? [data.primary_goal] : [],
    injuries: Array.isArray(data.injuries) ? data.injuries.join(", ") : "",
    allergies: data.allergies ?? [],
    foodDislikes: data.food_dislikes ?? [],
    metabolicProfile: data.metabolic_conditions ?? [],
    sleepQuality: data.sleep_hours_avg ?? 0,
    stressLevel: data.stress_level ?? 0,
    jobType: data.job_type ?? "",
    workSchedule: data.work_schedule ?? "",
    trainingExperience: "",
    workoutFrequency: 0,
    assignedProgramId: null,
    assignedNutritionTemplateId: null,
    streak: 0,
    level: "1",
    totalWorkoutsCompleted: 0,
    lastActiveAt: new Date().toISOString(),
    lastCheckInAt: null,
    progress: 0,
  };
}

/**
 * Generic partial update profila — koristi Profile stranica
 * (primary_goal autosave, current_weight/height inline edit).
 */
export async function updateProfileFields(
  userId: string,
  fields: Record<string, number | string | null>,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(fields as never)
    .eq("id", userId);
  if (error) throw new Error(`updateProfileFields: ${error.message}`);
}
