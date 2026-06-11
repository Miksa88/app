// ============================================================================
// Edge Function: start-pause (IT-16)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     clientId: "uuid",
//     pauseType: "illness" | "travel",
//     startDate: "YYYY-MM-DD" | ISO string,
//     pauseUntil?: "YYYY-MM-DD" | ISO string,  // planirani kraj pauze (max 30 dana)
//     notes?: string
//   }
//
// Odgovor (200):
//   { ok: true, pauseEvent: { ... DB row ... }, status: UserStatus }
//
// Odgovor (409):
//   { ok: false, error: "Already paused: ..." }   // parcijalni UNIQUE konflikt
//
// Odgovornosti:
//   1. JWT auth preko anon klijenta + `clientId === auth.uid` guard.
//   2. Insert u `pause_events`:
//        - `is_active = true`, `recovery_penalty = illness ? -0.15 : 0`,
//          `penalty_sessions_remaining = illness ? 2 : 0` (spec 01 §4.8).
//   3. Parcijalni UNIQUE index `idx_pause_events_one_active_per_user`
//      sprecava duple aktivne pauze — na unique_violation (23505) vraca 409.
//   4. Update UserStatus.training.activePauseEvent kroz upsert user_status.
//   5. Mirror u profiles.pause_state (isti shape kao trener-pauza) — jedan
//      izvor istine za PausedClientBanner + Gym blokadu + auto-expire.
//   6. Vraca novi DB red + novi UserStatus.
//
// pauseUntil pravila (MVP_PRESET gap #1):
//   - opcionalan; null = "dok se ne vratim" (indefinitivna pauza)
//   - mora biti > startDate i <= startDate + 30 dana (klijent-inicirana pauza
//     ne sme da zamrzne plan duze od mesec dana bez trenera)
//
// Spec reference:
//   01_TRAINING_FLOW_MASTER.md §4.8 (Pauza modul: illness 2 sesije -0.15)
//   RALPH_PLAN.md IT-16
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Deno ambient
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// ----------------------------------------------------------------------------
// CORS helpers
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

type PauseType = "illness" | "travel";

interface StartPausePayload {
  clientId: string;
  pauseType: PauseType;
  startDate: string; // YYYY-MM-DD ili ISO
  pauseUntil?: string; // YYYY-MM-DD ili ISO — planirani kraj (max 30 dana)
  notes?: string;
}

interface UserStatusShape {
  clientId: string;
  training: {
    activePauseEvent:
      | {
          type: PauseType | null;
          startDate: string | null;
          pauseUntil?: string | null;
          penaltySessionsRemaining: number;
          recoveryPenalty?: number;
        }
      | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ----------------------------------------------------------------------------
// Validacija
// ----------------------------------------------------------------------------

function validatePayload(p: unknown): StartPausePayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (typeof o.clientId !== "string" || o.clientId.length === 0) {
    return "Invalid `clientId` (expected non-empty string)";
  }
  if (o.pauseType !== "illness" && o.pauseType !== "travel") {
    return "Invalid `pauseType` (expected 'illness' | 'travel')";
  }
  if (typeof o.startDate !== "string" || o.startDate.length === 0) {
    return "Invalid `startDate` (expected non-empty string)";
  }
  if (o.notes !== undefined && typeof o.notes !== "string") {
    return "Invalid `notes` (expected string if provided)";
  }
  if (o.pauseUntil !== undefined && o.pauseUntil !== null && typeof o.pauseUntil !== "string") {
    return "Invalid `pauseUntil` (expected string if provided)";
  }

  return {
    clientId: o.clientId,
    pauseType: o.pauseType,
    startDate: o.startDate,
    pauseUntil: typeof o.pauseUntil === "string" ? o.pauseUntil : undefined,
    notes: typeof o.notes === "string" ? o.notes : undefined,
  };
}

function toDateOnly(input: string): string {
  // Podrzi ISO (2026-04-23T08:00:00Z) i YYYY-MM-DD
  return input.slice(0, 10);
}

// Maksimalno trajanje klijent-inicirane pauze (server-side guard).
const MAX_PAUSE_DAYS = 30;

/**
 * Validira pauseUntil u odnosu na startDate.
 * Vraca normalizovan YYYY-MM-DD ili string sa greskom.
 */
function validatePauseUntil(
  startDateOnly: string,
  pauseUntilRaw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const untilOnly = toDateOnly(pauseUntilRaw);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(untilOnly)) {
    return { ok: false, error: "Invalid `pauseUntil` date format (expected YYYY-MM-DD)" };
  }
  const start = new Date(`${startDateOnly}T00:00:00Z`).getTime();
  const until = new Date(`${untilOnly}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(until)) {
    return { ok: false, error: "Invalid `pauseUntil` or `startDate` date" };
  }
  if (until <= start) {
    return { ok: false, error: "`pauseUntil` mora biti posle `startDate`" };
  }
  const days = (until - start) / 86_400_000;
  if (days > MAX_PAUSE_DAYS) {
    return { ok: false, error: `Pauza moze trajati najvise ${MAX_PAUSE_DAYS} dana` };
  }
  return { ok: true, value: untilOnly };
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
  let payload: StartPausePayload;
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
      { error: "Forbidden: clientId ne odgovara auth.uid" },
      403,
    );
  }

  // 4. Service-role klijent
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 5. Insert pause_events (spec 01 §4.8: illness = -0.15 penalty, 2 sesije;
  //    travel = 0 penalty, 0 sesija — samo pauzira plan)
  const isIllness = payload.pauseType === "illness";
  const startDateOnly = toDateOnly(payload.startDate);

  // 4b. Validacija planiranog kraja pauze (max 30 dana, server-side guard)
  let pauseUntilOnly: string | null = null;
  if (payload.pauseUntil) {
    const validated = validatePauseUntil(startDateOnly, payload.pauseUntil);
    if (!validated.ok) {
      return jsonResponse(HDRS, { ok: false, error: validated.error }, 400);
    }
    pauseUntilOnly = validated.value;
  }

  const { data: pauseData, error: insertErr } = await admin
    .from("pause_events")
    .insert({
      user_id: userId,
      pause_type: payload.pauseType,
      start_date: startDateOnly,
      is_active: true,
      recovery_penalty: isIllness ? -0.15 : 0,
      penalty_sessions_remaining: isIllness ? 2 : 0,
      notes: payload.notes ?? null,
    })
    .select(
      "id, user_id, pause_type, start_date, end_date, is_active, recovery_penalty, penalty_sessions_remaining, notes, created_at, updated_at",
    )
    .single();

  if (insertErr) {
    // Parcijalni UNIQUE index: ako klijent vec ima aktivnu pauzu, 23505
    // unique_violation — vratimo 409 sa jasnom porukom.
    // PostgREST postgresql error code dolazi kroz `code` polje.
    const code = (insertErr as { code?: string }).code;
    if (code === "23505") {
      return jsonResponse(HDRS,
        { ok: false, error: "Vec imas aktivnu pauzu. Zavrsi je pre nove." },
        409,
      );
    }
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[start-pause] pause_events insert failed", insertErr.message);
    return jsonResponse(HDRS, { error: "pause_events insert failed" }, 500);
  }

  // 6. Load trenutni user_status, patch activePauseEvent, upsert
  const { data: rowData, error: loadErr } = await admin
    .from("user_status")
    .select("client_id, status_json")
    .eq("client_id", userId)
    .maybeSingle();

  if (loadErr) {
    console.error("[start-pause] user_status load failed", loadErr.message);
    return jsonResponse(HDRS, { error: "user_status load failed" }, 500);
  }
  if (!rowData?.status_json) {
    return jsonResponse(HDRS, { error: "user_status not found for client" }, 404);
  }

  const status = rowData.status_json as UserStatusShape;

  const newStatus: UserStatusShape = {
    ...status,
    training: {
      ...status.training,
      activePauseEvent: {
        type: payload.pauseType,
        startDate: startDateOnly,
        pauseUntil: pauseUntilOnly,
        penaltySessionsRemaining: isIllness ? 2 : 0,
        recoveryPenalty: isIllness ? -0.15 : 0,
      },
    },
    lastUpdatedAt: new Date().toISOString(),
  };

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
    console.error("[start-pause] user_status upsert failed", upsertErr.message);
    return jsonResponse(HDRS, { error: "user_status upsert failed" }, 500);
  }

  // 7. Mirror u profiles.pause_state — isti shape kao trener-pauza
  //    (clientPauseService.PauseState). Time PausedClientBanner, Gym blokada
  //    i isPauseExpired() auto-resume rade identicno za obe vrste pauze.
  const { error: pauseStateErr } = await admin
    .from("profiles")
    .update({
      pause_state: {
        paused_at: new Date().toISOString(),
        pause_until: pauseUntilOnly,
        reason: payload.pauseType,
        paused_by_trainer_id: null, // klijent-inicirana pauza
      },
    })
    .eq("id", userId);

  if (pauseStateErr) {
    // Ne-blokirajuce: pause_events + user_status su vec upisani; banner ce
    // i dalje raditi preko activePauseEvent fallback-a. Logujemo i nastavljamo.
    console.error("[start-pause] profiles.pause_state mirror failed", pauseStateErr.message);
  }

  return jsonResponse(HDRS, {
    ok: true,
    pauseEvent: pauseData,
    status: newStatus,
  });
});
