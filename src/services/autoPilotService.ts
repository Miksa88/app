// ============================================================================
// autoPilotService — query helpers koji pozivaju autoPilotSignals analyzer-e
// Spec: roadmap Faza E
// ============================================================================
//
// Dovlači realne podatke iz Supabase, agregira ih, pa zove pure functions
// iz utils/sync/autoPilotSignals.ts za verdikt.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import {
  detectPlateau,
  checkBeginnerPromoteSignal,
  checkMissingVideos,
  groupHistoryBySession,
  type PlateauVerdict,
  type PromoteVerdict,
  type MissingVideoVerdict,
} from "@/utils/sync/autoPilotSignals";
import type { UserStatus } from "@/types/userStatus";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// ============================================================================
// Plateau check za jednog klijenta
// ============================================================================

export async function checkClientPlateau(
  clientId: string,
  targetMode: "deficit" | "recomposition" | "lean_bulk" | "maintenance",
): Promise<PlateauVerdict> {
  const { data } = await supabase
    .from("weekly_check_ins")
    .select("week_start_date, weight_avg_kg")
    .eq("user_id", clientId)
    .order("week_start_date", { ascending: false })
    .limit(8);

  const samples = (data ?? []).map((row) => ({
    weekStartDate: row.week_start_date,
    weightAvgKg: row.weight_avg_kg,
  }));

  return detectPlateau(samples, targetMode);
}

// ============================================================================
// Plateau alert feed za trener dashboard — sve at-risk klijentkinje sa plateau
// ============================================================================

export interface PlateauAlert {
  clientId: string;
  firstName: string | null;
  lastName: string | null;
  weeksObserved: number;
  trendKgPerWeek: number;
  suggestion: string;
}

export async function getTrainerPlateauAlerts(): Promise<PlateauAlert[]> {
  // Učitaj sve klijentkinje (role='client') + njihov target mode iz user_status
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("role", "client");

  if (!profiles || profiles.length === 0) return [];

  const clientIds = profiles.map((p) => p.id);

  // Batch fetch user_status za sve klijente (N+1 elimination)
  const { data: statusRows } = await supabase
    .from("user_status")
    .select("client_id, status_json")
    .in("client_id", clientIds);

  const statusByClient = new Map<string, UserStatus>();
  for (const row of statusRows ?? []) {
    statusByClient.set(
      row.client_id,
      row.status_json as unknown as UserStatus,
    );
  }

  // Batch fetch weekly_check_ins za sve klijente (limit liberal — server pošalje
  // sve nedeljne redove zadnjih 8 nedelja, mi grupišemo po user_id u kodu)
  const { data: weeklyRows } = await supabase
    .from("weekly_check_ins")
    .select("user_id, week_start_date, weight_avg_kg")
    .in("user_id", clientIds)
    .order("week_start_date", { ascending: false });

  const samplesByClient = new Map<
    string,
    Array<{ weekStartDate: string; weightAvgKg: number | null }>
  >();
  for (const row of weeklyRows ?? []) {
    const arr = samplesByClient.get(row.user_id) ?? [];
    if (arr.length < 8) {
      arr.push({
        weekStartDate: row.week_start_date,
        weightAvgKg: row.weight_avg_kg,
      });
    }
    samplesByClient.set(row.user_id, arr);
  }

  const alerts: PlateauAlert[] = [];
  for (const p of profiles) {
    const status = statusByClient.get(p.id);
    if (!status) continue;

    const targetMode = status.nutrition?.targetMode ?? "maintenance";
    const samples = samplesByClient.get(p.id) ?? [];
    const verdict = detectPlateau(samples, targetMode);
    if (verdict.kind === "plateau") {
      alerts.push({
        clientId: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        weeksObserved: verdict.weeksObserved,
        trendKgPerWeek: verdict.trendKgPerWeek,
        suggestion: verdict.suggestion,
      });
    }
  }

  return alerts;
}

// ============================================================================
// Beginner→Intermediate promote signal za jednog klijenta
// ============================================================================

export async function checkClientPromoteSignal(
  clientId: string,
  currentExperience: "beginner" | "intermediate",
): Promise<PromoteVerdict> {
  if (currentExperience !== "beginner") {
    return { kind: "stay", reason: "already_intermediate" };
  }

  // Pull last 30 exercise_progress sets — više nego dovoljno za 8+ sesija
  const { data: progressRaw } = await supabase
    .from("exercise_progress")
    .select("weight_kg, reps, set_number, rir, completed_at, exercise_id")
    .eq("user_id", clientId)
    .order("completed_at", { ascending: false })
    .limit(60);

  if (!progressRaw || progressRaw.length === 0) {
    return { kind: "stay", reason: "no_history" };
  }

  // Za sada koristi default rep range top = 12 (pure function podržava per-exercise)
  const repTopMap = new Map<string, number>();
  for (const row of progressRaw) {
    if (!repTopMap.has(row.exercise_id)) {
      repTopMap.set(row.exercise_id, 12);
    }
  }

  const history = progressRaw.map((row) => ({
    weight_kg: Number(row.weight_kg),
    reps: row.reps,
    set_number: row.set_number,
    rir: row.rir,
    completed_at: row.completed_at,
  }));

  const sessions = groupHistoryBySession(history, repTopMap);
  return checkBeginnerPromoteSignal(sessions, currentExperience);
}

// ============================================================================
// Missing video signal za trener dashboard
// ============================================================================

export async function getMissingVideoSignal(): Promise<MissingVideoVerdict> {
  // Vežbe sa null video_url (system + trainer-created)
  const { data } = await supabase
    .from("exercises")
    .select("id, name, video_url")
    .is("video_url", null)
    .order("name", { ascending: true })
    .limit(20);

  const exercises = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    videoUrl: row.video_url,
  }));

  return checkMissingVideos(exercises);
}

// ============================================================================
// Funnel stats — koliko klijenata po tier-u + transition delta zadnjih 30 dana
// ============================================================================

export interface FunnelStats {
  totals: {
    entry: number;
    mid: number;
    high: number;
    unassigned: number;
  };
  /** Klijenti koji su prešli na high tier u zadnjih 30 dana (assigned_at >= now - 30d) */
  highRecent: number;
  /** Klijenti koji su upisani u zadnjih 30 dana */
  newClientsRecent: number;
}

export async function getFunnelStats(): Promise<FunnelStats> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("assigned_tier, assigned_at, created_at, role")
    .eq("role", "client");

  if (!profiles) {
    return {
      totals: { entry: 0, mid: 0, high: 0, unassigned: 0 },
      highRecent: 0,
      newClientsRecent: 0,
    };
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let entry = 0, mid = 0, high = 0, unassigned = 0;
  let highRecent = 0;
  let newClientsRecent = 0;

  for (const p of profiles) {
    if (p.assigned_tier === "entry") entry += 1;
    else if (p.assigned_tier === "mid") mid += 1;
    else if (p.assigned_tier === "high") high += 1;
    else unassigned += 1;

    if (p.assigned_tier === "high" && p.assigned_at) {
      if (new Date(p.assigned_at).getTime() >= thirtyDaysAgo) {
        highRecent += 1;
      }
    }

    if (p.created_at && new Date(p.created_at).getTime() >= thirtyDaysAgo) {
      newClientsRecent += 1;
    }
  }

  return {
    totals: { entry, mid, high, unassigned },
    highRecent,
    newClientsRecent,
  };
}

// ============================================================================
// Manual tier promotion (trener akcija)
// ============================================================================

export async function promoteClientToTier(
  clientId: string,
  newTier: "entry" | "mid" | "high",
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      assigned_tier: newTier,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", clientId);
  if (error) throw new Error(`promoteClientToTier(${clientId}): ${error.message}`);
}
