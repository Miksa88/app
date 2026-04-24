// ============================================================================
// supabaseAdmin.ts — service_role klijent za DB verifikaciju u testovima
// ============================================================================
// KORISTI SE SAMO U TESTOVIMA (lokalno). Service_role key nikad u frontend.
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "[supabaseAdmin] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.test",
  );
}

export const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ----------------------------------------------------------------------------
// DB verify helpers
// ----------------------------------------------------------------------------

export async function getLatestRow<T = Record<string, unknown>>(
  table: string,
  userId: string,
  orderBy = "created_at",
): Promise<T | null> {
  const { data, error } = await admin
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order(orderBy, { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[getLatestRow ${table}] ${error.message}`);
  return data as T | null;
}

export async function countRows(table: string, userId: string): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`[countRows ${table}] ${error.message}`);
  return count ?? 0;
}

export async function getUserStatus(userId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin
    .from("user_status")
    .select("status_json")
    .eq("client_id", userId)
    .maybeSingle();
  if (error) throw new Error(`[getUserStatus] ${error.message}`);
  return (data?.status_json as Record<string, unknown>) ?? null;
}

// ----------------------------------------------------------------------------
// Reset — briše sve write-side podatke test user-a pre run-a
// ----------------------------------------------------------------------------

export async function resetTestUserData(userId: string): Promise<void> {
  const tables = [
    "daily_check_ins",
    "weight_logs",
    "weekly_check_ins",
    "exercise_progress",
    "meal_logs",
    "water_logs",
    "pause_events",
  ];
  for (const t of tables) {
    const { error } = await admin.from(t).delete().eq("user_id", userId);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn(`[resetTestUserData ${t}] ${error.message}`);
    }
  }
  // user_status ostaje (needed za app to render); samo reset last_updated_at
}

// ----------------------------------------------------------------------------
// Ensure profile + user_status exists (idempotent)
// ----------------------------------------------------------------------------

export async function ensureProfile(userId: string, email: string): Promise<void> {
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return;

  const { error } = await admin.from("profiles").insert({
    id: userId,
    email,
    first_name: "Beta",
    last_name: "Tester",
    role: "client",
    experience_level: "beginner",
    training_days: 3,
    primary_goal: "fat_loss",
    current_weight: 60,
    height: 168,
    sleep_hours_avg: 7,
    stress_level: 3,
    job_physicality: "sedentary",
    allergies: [],
    injuries: [],
    food_dislikes: [],
    metabolic_conditions: [],
    cycle_tracking_enabled: false,
  });
  if (error) throw new Error(`[ensureProfile] ${error.message}`);
}
