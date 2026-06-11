// ============================================================================
// Edge Function: process-weekly-check-in (IT-17)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     clientId: "uuid",
//     weekStartDate: "YYYY-MM-DD",      // Monday of the week
//     weightAvgKg: 62.4,
//     waistCm?: 72.0,
//     hipCm?: 95.0,
//     thighCm?: 58.0,
//     energyAvg: 7.5,                    // 1–10
//     identityScore: 4,                  // 1–5
//     notes?: string
//   }
//
// Odgovor (200):
//   { ok: true, weeklyRow: {...}, status: UserStatus, trendline: {...} }
//
// Odgovor (409): { ok: false, error: "Već si popunila ovu nedelju" }
// Odgovor (403): { ok: false, error: "Forbidden: clientId mismatch" }
//
// Odgovornosti:
//   1. JWT auth + `clientId === auth.uid` guard (403 mismatch)
//   2. Insert u `weekly_check_ins` (UNIQUE user_id+week_start_date → 409)
//   3. Fetch poslednja DVA weekly reda (novi + prethodni) → compute delta
//   4. Load UserStatus
//   5. Run trendline adaptation (applyWeeklyTrendline pure helper):
//      - Skip ako weightDataReliable=false (menstrualna faza)
//      - Per targetMode: deficit/lean_bulk/maintenance/recomposition
//   6. Patch UserStatus.nutrition.currentCalorieTarget (ako je action != status_quo)
//   7. Patch UserStatus.bio.weeklyWeightDelta, redFlags.daysSinceLastWeeklyCheckIn=0,
//      nutrition.daysSincePlanChange = 0 (reset posle adaptacije)
//   8. Upsert user_status sa service_role
//
// Spec reference:
//   02_NUTRITION_FLOW_MASTER.md §10 (Weekly + trendline)
//   03_INTEGRATION_LAYER.md §3.2 Rule 8 (cycle_menstrual_ignore)
//   RALPH_PLAN.md IT-17
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  applyWeeklyTrendline,
  type WeeklyTrendlineMode,
  type WeeklyTrendlineResult,
} from "../_shared/weeklyTrendline.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// ----------------------------------------------------------------------------
// CORS
// ----------------------------------------------------------------------------

// CORS dolazi iz _shared/cors.ts (origin whitelist preko ALLOWED_ORIGINS)
function jsonResponse(
  HDRS: Record<string, string>,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...HDRS,
      "Content-Type": "application/json",
    },
  });
}

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface WeeklyCheckInPayload {
  clientId: string;
  weekStartDate: string;   // YYYY-MM-DD (Monday)
  weightAvgKg: number;
  waistCm?: number | null;
  hipCm?: number | null;
  thighCm?: number | null;
  energyAvg: number;
  identityScore: number;
  /** Recovery feeders (opcioni za backward compat). */
  sleepHoursAvg?: number;
  stressAvg?: number;
  /** Biofeedback inputs (pocetnici.md §4.3) — libido <4 → pauseSmartCut. */
  libidoScore?: number;
  waterRetentionScore?: number;
  notes?: string | null;
}

interface WeeklyCheckInRow {
  id: string;
  user_id: string;
  week_start_date: string;
  weight_avg_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
  thigh_cm: number | null;
  energy_avg: number | null;
  identity_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UserStatusShape {
  clientId: string;
  bio: {
    weeklyWeightDelta?: number;
    weightDataReliable?: boolean;
    [k: string]: unknown;
  };
  nutrition: {
    currentCalorieTarget: number;
    targetMode: string;
    daysSincePlanChange?: number;
    [k: string]: unknown;
  };
  redFlags: {
    daysSinceLastWeeklyCheckIn?: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

// ----------------------------------------------------------------------------
// Validacija
// ----------------------------------------------------------------------------

function validatePayload(p: unknown): WeeklyCheckInPayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (typeof o.clientId !== "string" || o.clientId.length === 0) {
    return "Invalid `clientId` (non-empty string expected)";
  }
  if (typeof o.weekStartDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.weekStartDate)) {
    return "Invalid `weekStartDate` (YYYY-MM-DD expected)";
  }
  if (typeof o.weightAvgKg !== "number" || o.weightAvgKg < 20 || o.weightAvgKg > 300) {
    return "Invalid `weightAvgKg` (20–300)";
  }
  if (typeof o.energyAvg !== "number" || o.energyAvg < 1 || o.energyAvg > 10) {
    return "Invalid `energyAvg` (1–10)";
  }
  if (
    typeof o.identityScore !== "number" ||
    !Number.isInteger(o.identityScore) ||
    o.identityScore < 1 ||
    o.identityScore > 5
  ) {
    return "Invalid `identityScore` (integer 1–5)";
  }
  for (const key of ["waistCm", "hipCm", "thighCm"] as const) {
    const v = o[key];
    if (v != null && (typeof v !== "number" || v < 20 || v > 200)) {
      return `Invalid \`${key}\` (20–200 or null)`;
    }
  }
  if (o.notes !== undefined && o.notes !== null && typeof o.notes !== "string") {
    return "Invalid `notes` (string or null expected)";
  }

  // Recovery inputs su opcioni — validacija ako su poslati
  if (o.sleepHoursAvg !== undefined &&
      (typeof o.sleepHoursAvg !== "number" || o.sleepHoursAvg < 0 || o.sleepHoursAvg > 14)) {
    return "Invalid `sleepHoursAvg` (0–14)";
  }
  if (o.stressAvg !== undefined &&
      (typeof o.stressAvg !== "number" || o.stressAvg < 1 || o.stressAvg > 5)) {
    return "Invalid `stressAvg` (1–5)";
  }

  // Biofeedback inputs su opcioni — validacija ako su poslati (1–10)
  if (o.libidoScore !== undefined &&
      (typeof o.libidoScore !== "number" || !Number.isInteger(o.libidoScore) ||
       o.libidoScore < 1 || o.libidoScore > 10)) {
    return "Invalid `libidoScore` (integer 1–10)";
  }
  if (o.waterRetentionScore !== undefined &&
      (typeof o.waterRetentionScore !== "number" || !Number.isInteger(o.waterRetentionScore) ||
       o.waterRetentionScore < 1 || o.waterRetentionScore > 10)) {
    return "Invalid `waterRetentionScore` (integer 1–10)";
  }

  return {
    clientId: o.clientId,
    weekStartDate: o.weekStartDate,
    weightAvgKg: o.weightAvgKg,
    waistCm: (o.waistCm as number | null | undefined) ?? null,
    hipCm: (o.hipCm as number | null | undefined) ?? null,
    thighCm: (o.thighCm as number | null | undefined) ?? null,
    energyAvg: o.energyAvg,
    identityScore: o.identityScore,
    sleepHoursAvg: o.sleepHoursAvg as number | undefined,
    stressAvg: o.stressAvg as number | undefined,
    libidoScore: o.libidoScore as number | undefined,
    waterRetentionScore: o.waterRetentionScore as number | undefined,
    notes: (o.notes as string | null | undefined) ?? null,
  };
}

function isKnownTargetMode(mode: string): mode is WeeklyTrendlineMode {
  return (
    mode === "deficit" ||
    mode === "lean_bulk" ||
    mode === "maintenance" ||
    mode === "recomposition"
  );
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS headeri po request-u (origin whitelist)
  const HDRS = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: HDRS });
  }

  if (req.method !== "POST") {
    return jsonResponse(HDRS, { error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(HDRS, { error: "Server misconfigured" }, 500);
  }

  // 1. JWT auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(HDRS, { error: "Missing Authorization" }, 401);
  }
  const jwt = authHeader.slice("Bearer ".length).trim();

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: userData, error: userErr } = await anonClient.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return jsonResponse(HDRS, { error: "Invalid JWT" }, 401);
  }
  const userId = userData.user.id;

  // 2. Parse + validate payload
  let payload: WeeklyCheckInPayload;
  try {
    const body = await req.json();
    const validated = validatePayload(body);
    if (typeof validated === "string") {
      return jsonResponse(HDRS, { error: validated }, 400);
    }
    payload = validated;
  } catch {
    return jsonResponse(HDRS, { error: "Invalid JSON" }, 400);
  }

  // 3. clientId guard
  if (payload.clientId !== userId) {
    return jsonResponse(HDRS,
      { ok: false, error: "Forbidden: clientId ne odgovara auth.uid" },
      403,
    );
  }

  // 4. Service-role klijent
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 5. Insert weekly_check_ins — UNIQUE (user_id, week_start_date) → 23505 = 409
  const { data: insertedRow, error: insertErr } = await admin
    .from("weekly_check_ins")
    .insert({
      user_id: userId,
      week_start_date: payload.weekStartDate,
      weight_avg_kg: payload.weightAvgKg,
      waist_cm: payload.waistCm,
      hip_cm: payload.hipCm,
      thigh_cm: payload.thighCm,
      energy_avg: payload.energyAvg,
      identity_score: payload.identityScore,
      libido_score: payload.libidoScore ?? null,
      water_retention: payload.waterRetentionScore ?? null,
      notes: payload.notes,
    })
    .select()
    .single();

  if (insertErr) {
    const code = (insertErr as { code?: string }).code;
    if (code === "23505") {
      return jsonResponse(HDRS,
        { ok: false, error: "Već si popunila ovu nedelju." },
        409,
      );
    }
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[process-weekly-check-in] weekly_check_ins insert failed", insertErr.message);
    return jsonResponse(HDRS, { error: "weekly_check_ins insert failed" }, 500);
  }

  // 6. Fetch prethodna dva weekly reda (uključujući tek ubačen) da izračuna delta
  const { data: recentRows, error: recentErr } = await admin
    .from("weekly_check_ins")
    .select(
      "id, user_id, week_start_date, weight_avg_kg, waist_cm, hip_cm, thigh_cm, energy_avg, identity_score, notes, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("week_start_date", { ascending: false })
    .limit(2);

  if (recentErr) {
    console.error("[process-weekly-check-in] weekly_check_ins fetch failed", recentErr.message);
    return jsonResponse(HDRS, { error: "weekly_check_ins fetch failed" }, 500);
  }

  const rows = (recentRows as WeeklyCheckInRow[] | null) ?? [];
  let weeklyWeightDelta: number | null = null;
  if (rows.length >= 2 && rows[0].weight_avg_kg != null && rows[1].weight_avg_kg != null) {
    weeklyWeightDelta = Number(
      (Number(rows[0].weight_avg_kg) - Number(rows[1].weight_avg_kg)).toFixed(2),
    );
  }

  // 7. Load UserStatus
  const { data: statusRow, error: loadErr } = await admin
    .from("user_status")
    .select("client_id, status_json")
    .eq("client_id", userId)
    .maybeSingle();

  if (loadErr) {
    console.error("[process-weekly-check-in] user_status load failed", loadErr.message);
    return jsonResponse(HDRS, { error: "user_status load failed" }, 500);
  }
  if (!statusRow?.status_json) {
    return jsonResponse(HDRS, { error: "user_status not found for client" }, 404);
  }

  const status = statusRow.status_json as UserStatusShape;

  // 8. Run trendline adaptation
  const mode = status.nutrition.targetMode;
  let trendlineResult: WeeklyTrendlineResult;
  if (!isKnownTargetMode(mode)) {
    // Konzervativan fallback — ne adaptira nepoznat mode
    trendlineResult = {
      newCalorieTarget: status.nutrition.currentCalorieTarget,
      action: "status_quo",
      reason: `unknown_target_mode:${mode}`,
    };
  } else {
    trendlineResult = applyWeeklyTrendline({
      currentCalorieTarget: status.nutrition.currentCalorieTarget,
      targetMode: mode,
      weeklyWeightDelta,
      weightDataReliable: status.bio.weightDataReliable !== false,
    });
  }

  // 9. Patch status — recovery feeders refresh-uju 7-day avg-ove iz weekly
  // (jedini izvor sad kad daily check-in više nije aktivan)
  const newStatus: UserStatusShape = {
    ...status,
    bio: {
      ...status.bio,
      weeklyWeightDelta: weeklyWeightDelta ?? 0,
      ...(payload.sleepHoursAvg !== undefined
        ? { sleepLast7DaysAvg: payload.sleepHoursAvg }
        : {}),
      ...(payload.stressAvg !== undefined
        ? { stressLast7DaysAvg: payload.stressAvg }
        : {}),
      // pocetnici.md §4.3: biofeedback inputs feed applyBiofeedbackReactiveRules
      // u syncEngine — libido <4 → pauseSmartCut; waterRetention >7 → alert
      ...(payload.libidoScore !== undefined
        ? { latestLibidoScore: payload.libidoScore }
        : {}),
      ...(payload.waterRetentionScore !== undefined
        ? { latestWaterRetentionScore: payload.waterRetentionScore }
        : {}),
    },
    nutrition: {
      ...status.nutrition,
      currentCalorieTarget: trendlineResult.newCalorieTarget,
      daysSincePlanChange: 0,
    },
    redFlags: {
      ...status.redFlags,
      daysSinceLastWeeklyCheckIn: 0,
    },
    lastUpdatedAt: new Date().toISOString(),
  };

  // 10. Upsert user_status
  const { error: upsertErr } = await admin
    .from("user_status")
    .upsert(
      {
        client_id: userId,
        status_json: newStatus,
        last_updated_at: newStatus.lastUpdatedAt as string,
      },
      { onConflict: "client_id" },
    );

  if (upsertErr) {
    console.error("[process-weekly-check-in] user_status upsert failed", upsertErr.message);
    return jsonResponse(HDRS, { error: "user_status upsert failed" }, 500);
  }

  return jsonResponse(HDRS, {
    ok: true,
    weeklyRow: insertedRow,
    status: newStatus,
    trendline: trendlineResult,
    weeklyWeightDelta,
  });
});
