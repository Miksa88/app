// ============================================================================
// Edge Function: start-pause (IT-16)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     clientId: "uuid",
//     pauseType: "illness" | "travel",
//     startDate: "YYYY-MM-DD" | ISO string,
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
//   5. Vraca novi DB red + novi UserStatus.
//
// Spec reference:
//   01_TRAINING_FLOW_MASTER.md §4.8 (Pauza modul: illness 2 sesije -0.15)
//   RALPH_PLAN.md IT-16
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Deno ambient
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// ----------------------------------------------------------------------------
// CORS helpers
// ----------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
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
  notes?: string;
}

interface UserStatusShape {
  clientId: string;
  training: {
    activePauseEvent:
      | {
          type: PauseType | null;
          startDate: string | null;
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

  return {
    clientId: o.clientId,
    pauseType: o.pauseType,
    startDate: o.startDate,
    notes: typeof o.notes === "string" ? o.notes : undefined,
  };
}

function toDateOnly(input: string): string {
  // Podrzi ISO (2026-04-23T08:00:00Z) i YYYY-MM-DD
  return input.slice(0, 10);
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  // 1. JWT auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing Authorization" }, 401);
  }
  const jwt = authHeader.slice("Bearer ".length).trim();

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: userData, error: userErr } = await anonClient.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "Invalid JWT" }, 401);
  }
  const userId = userData.user.id;

  // 2. Parse + validate payload
  let payload: StartPausePayload;
  try {
    const body = await req.json();
    const validated = validatePayload(body);
    if (typeof validated === "string") {
      return jsonResponse({ error: validated }, 400);
    }
    payload = validated;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  // 3. clientId guard
  if (payload.clientId !== userId) {
    return jsonResponse(
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
      return jsonResponse(
        { ok: false, error: "Vec imas aktivnu pauzu. Zavrsi je pre nove." },
        409,
      );
    }
    return jsonResponse(
      { error: `pause_events insert failed: ${insertErr.message}` },
      500,
    );
  }

  // 6. Load trenutni user_status, patch activePauseEvent, upsert
  const { data: rowData, error: loadErr } = await admin
    .from("user_status")
    .select("client_id, status_json")
    .eq("client_id", userId)
    .maybeSingle();

  if (loadErr) {
    return jsonResponse(
      { error: `user_status load failed: ${loadErr.message}` },
      500,
    );
  }
  if (!rowData?.status_json) {
    return jsonResponse({ error: "user_status not found for client" }, 404);
  }

  const status = rowData.status_json as UserStatusShape;

  const newStatus: UserStatusShape = {
    ...status,
    training: {
      ...status.training,
      activePauseEvent: {
        type: payload.pauseType,
        startDate: startDateOnly,
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
    return jsonResponse(
      { error: `user_status upsert failed: ${upsertErr.message}` },
      500,
    );
  }

  return jsonResponse({
    ok: true,
    pauseEvent: pauseData,
    status: newStatus,
  });
});
