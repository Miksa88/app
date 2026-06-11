// ============================================================================
// Edge Function: swap-next-sessions (IT-10)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     clientId: "uuid"
//   }
//
// Odgovor (200):
//   {
//     ok: true,
//     success: true,
//     newFirstSession: <QueuedSession>,
//     status: <UserStatus JSON>
//   }
//
// Odgovor (400):
//   {
//     ok: false,
//     error: "<reason>"
//   }
//
// Odgovornosti:
//   1. JWT auth preko anon klijenta (isti pattern kao process-workout-completion).
//   2. Guard: `clientId === auth.uid`.
//   3. service_role SELECT `user_status` po client_id.
//   4. Validate `canSwapNextTwoSessions(queue)` — ako nije allowed, 400 sa reason.
//   5. `swapNextTwoSessions(queue)` — novi queue sa zamenjenim pointer i pointer+1.
//   6. Recompute nextSessionId / nextSessionPartition (resolveNextSession).
//   7. Upsert `user_status.status_json` (service_role).
//   8. Vrati novi status + newFirstSession za UI feedback.
//
// NAPOMENA:
//   Swap je idempotentan u smislu "drugi swap u istom mikrociklusu je odbijen".
//   Ako klijentkinja klikne Undo — drugi swap zamenjuje nazad (A↔B → B↔A → A↔B),
//   ali `swapUsedThisMicrocycle=true` postavlja prvi swap i drugi ce biti
//   odbijen sa 400. Ovo je svesna biznis odluka (jedan swap po mikrociklusu
//   po spec-u); Undo UI ostvaruje ovo kroz `swapUsedThisMicrocycle=false`
//   resetovano pri sledecem microcycle completion-u.
//
//   Zbog toga: ako se prvi swap desi, Undo dugme ce pasti sa "Swap nije
//   dozvoljen" — za alpha prihvatljivo, jer user vidi toast error i zna da
//   moze da uradi samo jedan swap. Buducnost: Undo sa audit trail koji
//   ignorira swapUsed flag ako je unutar 30s window-a.
//
// Spec reference:
//   01_TRAINING_FLOW_MASTER.md §5 Korak 2.5 (Swap request)
//   RALPH_PLAN.md IT-10
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  canSwapNextTwoSessions,
  swapNextTwoSessions,
  resolveNextSession,
  type MesocycleQueue,
  type Partition,
  type QueuedSession,
} from "../_shared/queueAdvance.ts";

// Deno ambient (edge-runtime.d.ts donosi Deno.serve + Deno.env)
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// ----------------------------------------------------------------------------
// Types — user_status shape koji koristimo (opaque za sve drugo)
// ----------------------------------------------------------------------------

interface UserStatusTrainingShape {
  queue: MesocycleQueue;
  sessionPointer: number;
  nextSessionId: string;
  nextSessionPartition: Partition;
  [key: string]: unknown;
}

interface UserStatusShape {
  clientId: string;
  training: UserStatusTrainingShape;
  [key: string]: unknown;
}

interface SwapPayload {
  clientId: string;
}

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
// Validacija
// ----------------------------------------------------------------------------

function validatePayload(p: unknown): SwapPayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (typeof o.clientId !== "string" || o.clientId.length === 0) {
    return "Invalid `clientId` (expected non-empty string)";
  }

  return { clientId: o.clientId };
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
  let payload: SwapPayload;
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

  // 4. Service-role DB klijent
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 5. Load user_status
  const { data: rowData, error: loadErr } = await admin
    .from("user_status")
    .select("client_id, status_json")
    .eq("client_id", userId)
    .maybeSingle();

  if (loadErr) {
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[swap-next-sessions] user_status load failed", loadErr.message);
    return jsonResponse(HDRS, { error: "user_status load failed" }, 500);
  }
  if (!rowData?.status_json) {
    return jsonResponse(HDRS, { error: "user_status not found for client" }, 404);
  }

  const status = rowData.status_json as UserStatusShape;

  // 6. Guard: queue postoji
  const queue = status.training?.queue;
  if (!queue || !Array.isArray(queue.sessions)) {
    return jsonResponse(HDRS, { error: "user_status.training.queue missing" }, 500);
  }

  // 7. Validate swap eligibility — pure helper
  const eligibility = canSwapNextTwoSessions(queue);
  if (!eligibility.allowed) {
    return jsonResponse(HDRS,
      { ok: false, error: eligibility.reason ?? "Swap nije dozvoljen." },
      400,
    );
  }

  // 8. Perform swap — pure helper (novi queue, immutable)
  let newQueue: MesocycleQueue;
  try {
    newQueue = swapNextTwoSessions(queue);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "swap failed";
    console.error("[swap-next-sessions] swapNextTwoSessions failed", msg);
    return jsonResponse(HDRS, { ok: false, error: "swap failed" }, 400);
  }

  // 9. Recompute derived next session info (pointer nije promenjen, ali je
  //    sessions[pointer] sada druga sesija).
  const next: QueuedSession | null = resolveNextSession(newQueue);

  const newTraining: UserStatusTrainingShape = {
    ...status.training,
    queue: newQueue,
  };
  if (next) {
    newTraining.nextSessionId = next.sessionId;
    newTraining.nextSessionPartition = next.partition;
  }

  // 10. Compose new status + forsiraj server lastUpdatedAt
  const nowIso = new Date().toISOString();
  const newStatus: UserStatusShape = {
    ...status,
    training: newTraining,
    lastUpdatedAt: nowIso,
  };

  // 11. Atomic upsert
  const { error: upsertErr } = await admin
    .from("user_status")
    .upsert(
      {
        client_id: userId,
        status_json: newStatus,
        last_updated_at: nowIso,
      },
      { onConflict: "client_id" },
    );

  if (upsertErr) {
    console.error("[swap-next-sessions] user_status upsert failed", upsertErr.message);
    return jsonResponse(HDRS, { error: "user_status upsert failed" }, 500);
  }

  // 12. Vrati novi status + sledecu sesiju (za UI toast feedback)
  return jsonResponse(HDRS, {
    ok: true,
    success: true,
    newFirstSession: next,
    status: newStatus,
  });
});
