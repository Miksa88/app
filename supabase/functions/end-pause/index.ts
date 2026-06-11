// ============================================================================
// Edge Function: end-pause (IT-16)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     clientId: "uuid",
//     endDate?: "YYYY-MM-DD" | ISO string   // default: today (server date)
//   }
//
// Odgovor (200):
//   { ok: true, status: UserStatus }
//
// Odgovor (404):
//   { ok: false, error: "Nema aktivne pauze" }
//
// Odgovornosti:
//   1. JWT auth preko anon klijenta + `clientId === auth.uid` guard.
//   2. UPDATE `pause_events` SET is_active=false, end_date=<endDate || today>
//        WHERE user_id=auth.uid AND is_active=true.
//   3. Patch UserStatus.training.activePauseEvent = null i upsert.
//   4. Ocisti profiles.pause_state mirror (start-pause ga upisuje) — banner
//      i Gym blokada nestaju odmah po povratku.
//   5. Vraca novi UserStatus.
//
// Napomena: illness penalty countdown (penalty_sessions_remaining) se ne
// resetuje ovde — ostaje na izvornom redu i troshi se kroz
// process-workout-completion (IT-7). end-pause samo oznacava kraj pauze,
// recovery penalty nastavlja da se aplicira kroz jos 2 sesije posle povratka.
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

interface EndPausePayload {
  clientId: string;
  endDate?: string;
}

interface UserStatusShape {
  clientId: string;
  training: {
    activePauseEvent: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ----------------------------------------------------------------------------
// Validacija
// ----------------------------------------------------------------------------

function validatePayload(p: unknown): EndPausePayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (typeof o.clientId !== "string" || o.clientId.length === 0) {
    return "Invalid `clientId` (expected non-empty string)";
  }
  if (o.endDate !== undefined && typeof o.endDate !== "string") {
    return "Invalid `endDate` (expected string if provided)";
  }

  return {
    clientId: o.clientId,
    endDate: typeof o.endDate === "string" ? o.endDate : undefined,
  };
}

function toDateOnly(input: string): string {
  return input.slice(0, 10);
}

function todayYmd(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

  // 2. Parse + validate
  let payload: EndPausePayload;
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

  // 4. Service-role
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const endDateOnly = payload.endDate ? toDateOnly(payload.endDate) : todayYmd();

  // 5. UPDATE aktivne pauze (treba biti tacno 1 po parcijalnom UNIQUE indexu)
  const { data: updateData, error: updateErr } = await admin
    .from("pause_events")
    .update({
      is_active: false,
      end_date: endDateOnly,
    })
    .eq("user_id", userId)
    .eq("is_active", true)
    .select(
      "id, user_id, pause_type, start_date, end_date, is_active, recovery_penalty, penalty_sessions_remaining, notes, created_at, updated_at",
    );

  if (updateErr) {
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[end-pause] pause_events update failed", updateErr.message);
    return jsonResponse(HDRS, { error: "pause_events update failed" }, 500);
  }

  if (!updateData || updateData.length === 0) {
    return jsonResponse(HDRS,
      { ok: false, error: "Nema aktivne pauze za zavrsiti." },
      404,
    );
  }

  // 6. Patch UserStatus.training.activePauseEvent = null
  const { data: rowData, error: loadErr } = await admin
    .from("user_status")
    .select("client_id, status_json")
    .eq("client_id", userId)
    .maybeSingle();

  if (loadErr) {
    console.error("[end-pause] user_status load failed", loadErr.message);
    return jsonResponse(HDRS, { error: "user_status load failed" }, 500);
  }
  if (!rowData?.status_json) {
    return jsonResponse(HDRS, { error: "user_status not found for client" }, 404);
  }

  const status = rowData.status_json as UserStatusShape;

  // §5.3 (pocetnici.md, 2026-05-08): ako je upravo završena ILLNESS pauza,
  // prva nedelja povratka mora biti fiksni DELOAD (bez obzira na mezo poziciju).
  // Razlog: imuni sistem trošio glikogen + protein → mišić nije spreman za pun
  // stimulus prvih 7 dana. Trener može da skine flag manualno ako klijentkinja
  // pokaže pun oporavak.
  const wasIllnessPause = updateData[0]?.pause_type === "illness";
  const trainingPatch: Record<string, unknown> = {
    ...status.training,
    activePauseEvent: null,
  };
  if (wasIllnessPause) {
    trainingPatch.isInDeload = true;
    trainingPatch.illnessReentryDeloadUntil = new Date(
      Date.now() + 7 * 86_400_000,
    ).toISOString();
  }

  const newStatus: UserStatusShape = {
    ...status,
    training: trainingPatch,
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
    console.error("[end-pause] user_status upsert failed", upsertErr.message);
    return jsonResponse(HDRS, { error: "user_status upsert failed" }, 500);
  }

  // 7. Ocisti profiles.pause_state mirror (upisao ga start-pause).
  //    Ne-blokirajuce — pauza je vec zavrsena u pause_events + user_status.
  const { error: pauseStateErr } = await admin
    .from("profiles")
    .update({ pause_state: null })
    .eq("id", userId);

  if (pauseStateErr) {
    console.error("[end-pause] profiles.pause_state clear failed", pauseStateErr.message);
  }

  return jsonResponse(HDRS, {
    ok: true,
    status: newStatus,
    endedPauseEvent: updateData[0],
  });
});
