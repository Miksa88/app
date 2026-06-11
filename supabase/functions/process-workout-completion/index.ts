// ============================================================================
// Edge Function: process-workout-completion (IT-7)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     clientId: "uuid",
//     sessionId: "A1",
//     completedAt: "2026-04-23T18:30:00.000Z"   // ISO
//   }
//
// Odgovor (200):
//   {
//     ok: true,
//     queueAdvanced: true,
//     pauseJustEnded: false,
//     status: <UserStatus JSON>
//   }
//
// Odgovornosti (Atomic compute + persist — opcija A):
//   1. JWT auth preko anon klijenta (isti pattern kao save-user-status).
//   2. Guard: `clientId === auth.uid`.
//   3. service_role SELECT `user_status` po client_id.
//   4. Validate `queue.sessions[sessionPointer].sessionId === sessionId`
//      (guard: ne može da se završi sesija koja nije aktivna).
//   5. `advancePointerAfterCompletion(queue, completedAt)` — novi queue.
//   6. Decrement `returnFromBreakCountdown[partition]` + illness penalty
//      + mirror partitionLastSeen i sessionPointer na `training` sloj
//      (pure `applyPostCompletionCounters` — inline Deno port).
//   7. Recompute `nextSessionId` / `nextSessionPartition` (resolveNextSession).
//   8. Upsert `user_status.status_json` (service_role, atomic sa pause update).
//   9. Ako `pauseJustEnded` — UPDATE `pause_events` SET is_active=false,
//      end_date=completedAt (ATOMIC uz status save; ako bilo koji fail-uje,
//      vraćamo 500 — klijent retry-uje).
//
// NAPOMENA (razlika od save-user-status):
//   Ova EF NE poziva `runSyncRules` (god node, Deno port je ogroman posao).
//   IT-9 hook posle EF poziva `runSyncRules` na klijent-strani + `save-user-status`
//   za rebuild calorie target-a. Mini-race: između dva save-a, drugi agent bi
//   mogao da čita "poluznu" verziju. U praksi: Realtime push posle EF save-a
//   pa hook save-a; klijent vidi delta. Dovoljno za sad.
//
// Spec reference:
//   01_TRAINING_FLOW_MASTER.md §5 Korak 2.5 (onSessionCompleted)
//   01 §4.8 (PauseEvent illness penalty lifecycle)
//   03_INTEGRATION_LAYER.md §3.1 (WorkoutCompletion flow)
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  advancePointerAfterCompletion,
  resolveNextSession,
  type MesocycleQueue,
  type Partition,
} from "../_shared/queueAdvance.ts";

// Deno ambient (edge-runtime.d.ts donosi Deno.serve + Deno.env)
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// ----------------------------------------------------------------------------
// Types — user_status shape koji koristimo (opaque za sve drugo)
// ----------------------------------------------------------------------------

interface ActivePauseEvent {
  type: "illness" | "travel" | "other" | null;
  startDate: string | Date | null;
  penaltySessionsRemaining: number;
}

interface UserStatusTrainingShape {
  queue: MesocycleQueue;
  sessionPointer: number;
  nextSessionId: string;
  nextSessionPartition: Partition;
  partitionLastSeen: {
    Lower?: { date: string | Date; sessionId: string };
    Upper?: { date: string | Date; sessionId: string };
    FullBody?: { date: string | Date; sessionId: string };
  };
  isInReturnFromBreak: boolean;
  currentMicrocycleIndex: number;
  activePauseEvent: ActivePauseEvent | null;
  // ostale dimenzije (position, daysPerWeek, activeTemplateId, isInDeload,
  // currentMesocycleIndex) — helpers ih ne diraju, prosleđuju se kao-je.
  [key: string]: unknown;
}

interface UserStatusShape {
  clientId: string;
  training: UserStatusTrainingShape;
  [key: string]: unknown;
}

interface CompletionPayload {
  clientId: string;
  sessionId: string;
  completedAt: string; // ISO
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

function validatePayload(p: unknown): CompletionPayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (typeof o.clientId !== "string" || o.clientId.length === 0) {
    return "Invalid `clientId` (expected non-empty string)";
  }
  if (typeof o.sessionId !== "string" || o.sessionId.length === 0) {
    return "Invalid `sessionId` (expected non-empty string)";
  }
  if (typeof o.completedAt !== "string" || Number.isNaN(Date.parse(o.completedAt))) {
    return "Invalid `completedAt` (expected ISO timestamp)";
  }

  return {
    clientId: o.clientId,
    sessionId: o.sessionId,
    completedAt: o.completedAt,
  };
}

// ----------------------------------------------------------------------------
// Inline Deno port: applyPostCompletionCounters
// (source of truth: src/utils/db/workoutCompletion.ts — pokriven Vitest-om)
// ----------------------------------------------------------------------------

interface PostCompletionResult {
  training: UserStatusTrainingShape;
  pauseJustEnded: boolean;
}

function applyPostCompletionCounters(
  training: UserStatusTrainingShape,
  completedPartition: Partition,
): PostCompletionResult {
  // Mirror partitionLastSeen iz queue strane (queue je već advancovan).
  const queuePartitionEntry = training.queue.partitionLastSeen[completedPartition];
  const newPartitionLastSeen = queuePartitionEntry
    ? {
        ...training.partitionLastSeen,
        [completedPartition]: {
          date: queuePartitionEntry.date,
          sessionId: queuePartitionEntry.sessionId,
        },
      }
    : { ...training.partitionLastSeen };

  // Decrement RFB (min 0).
  const prevCountdown = training.queue.returnFromBreakCountdown[completedPartition] ?? 0;
  const nextCountdownForPartition = Math.max(0, prevCountdown - 1);
  const newReturnFromBreakCountdown = {
    ...training.queue.returnFromBreakCountdown,
    [completedPartition]: nextCountdownForPartition,
  };

  const isInReturnFromBreak = (Object.values(newReturnFromBreakCountdown) as number[])
    .some(v => typeof v === "number" && v > 0);

  // Illness penalty decrement + auto-end.
  let newActivePauseEvent = training.activePauseEvent;
  let pauseJustEnded = false;

  if (
    training.activePauseEvent &&
    training.activePauseEvent.type === "illness" &&
    training.activePauseEvent.penaltySessionsRemaining > 0
  ) {
    const nextRemaining = training.activePauseEvent.penaltySessionsRemaining - 1;
    if (nextRemaining <= 0) {
      newActivePauseEvent = null;
      pauseJustEnded = true;
    } else {
      newActivePauseEvent = {
        ...training.activePauseEvent,
        penaltySessionsRemaining: nextRemaining,
      };
    }
  }

  const newTraining: UserStatusTrainingShape = {
    ...training,
    queue: {
      ...training.queue,
      returnFromBreakCountdown: newReturnFromBreakCountdown,
    },
    sessionPointer: training.queue.sessionPointer,
    currentMicrocycleIndex: training.queue.currentMicrocycleIndex,
    partitionLastSeen: newPartitionLastSeen,
    isInReturnFromBreak,
    activePauseEvent: newActivePauseEvent,
  };

  return { training: newTraining, pauseJustEnded };
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
  let payload: CompletionPayload;
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
    console.error("[process-workout-completion] user_status load failed", loadErr.message);
    return jsonResponse(HDRS, { error: "user_status load failed" }, 500);
  }
  if (!rowData?.status_json) {
    return jsonResponse(HDRS, { error: "user_status not found for client" }, 404);
  }

  const status = rowData.status_json as UserStatusShape;

  // 6. Guard: sessionId === sessions[pointer].sessionId
  const queue = status.training?.queue;
  if (!queue || !Array.isArray(queue.sessions)) {
    return jsonResponse(HDRS, { error: "user_status.training.queue missing" }, 500);
  }

  const activeSession = queue.sessions[queue.sessionPointer];
  if (!activeSession) {
    return jsonResponse(HDRS,
      { error: "Queue has no active session (pointer beyond end)" },
      400,
    );
  }
  if (activeSession.sessionId !== payload.sessionId) {
    return jsonResponse(HDRS,
      {
        error: "Session mismatch: payload sessionId is not the active session",
        expected: activeSession.sessionId,
        received: payload.sessionId,
      },
      400,
    );
  }

  const completedPartition = activeSession.partition as Partition;
  const completedAtDate = new Date(payload.completedAt);

  // 7. Advance queue (pure, Deno port)
  let advancedQueue: MesocycleQueue;
  try {
    const advanceResult = advancePointerAfterCompletion(queue, completedAtDate);
    advancedQueue = advanceResult.queue;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "advance failed";
    console.error("[process-workout-completion] advancePointerAfterCompletion failed", msg);
    return jsonResponse(HDRS, { error: "queue advance failed" }, 400);
  }

  // 8. Counters + pause decrement (inline pure helper)
  const trainingAfterAdvance: UserStatusTrainingShape = {
    ...status.training,
    queue: advancedQueue,
    sessionPointer: advancedQueue.sessionPointer,
    currentMicrocycleIndex: advancedQueue.currentMicrocycleIndex,
  };

  const { training: newTraining, pauseJustEnded } = applyPostCompletionCounters(
    trainingAfterAdvance,
    completedPartition,
  );

  // 9. Recompute nextSessionId / nextSessionPartition
  const next = resolveNextSession(advancedQueue);
  if (next) {
    newTraining.nextSessionId = next.sessionId;
    newTraining.nextSessionPartition = next.partition;
  }
  // Ako je queue završen (next === null), ostavljamo prethodne vrednosti —
  // mesocycle lifecycle (IT-15) će ih resetovati pri ročnom generisanju novog mezo.

  // 10. Compose new status + forsiraj server lastUpdatedAt
  // Pre-workout fatigue signal važi samo za jednu sesiju — briši ga ovde.
  const nowIso = new Date().toISOString();
  const prevBio = (status.bio ?? {}) as Record<string, unknown>;
  const newBio = {
    ...prevBio,
    preWorkoutFatigue: false,
    preWorkoutFatigueAnsweredAt: null,
  };
  const newStatus: UserStatusShape = {
    ...status,
    bio: newBio,
    training: newTraining,
    lastUpdatedAt: nowIso,
  };

  // 11. Atomic persistence: upsert user_status; pri uspehu, ako pauseJustEnded,
  //     UPDATE pause_events. Ako drugi korak fail-uje, vraćamo 500 — klijent
  //     retry-uje; queue advance je idempotentan jer guard na liniji
  //     sessions[pointer].sessionId === sessionId bi pri retry-u odbio drugi
  //     put (pointer je već napredovao).
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
    console.error("[process-workout-completion] user_status upsert failed", upsertErr.message);
    return jsonResponse(HDRS, { error: "user_status upsert failed" }, 500);
  }

  // 12. Pause end: ako je illness pauza upravo završena, obeleži red u
  //     pause_events. Nalazimo najnoviji aktivni illness red za userId.
  if (pauseJustEnded) {
    const completedDateYmd = payload.completedAt.slice(0, 10);
    const { error: pauseUpdErr } = await admin
      .from("pause_events")
      .update({
        is_active: false,
        end_date: completedDateYmd,
      })
      .eq("user_id", userId)
      .eq("is_active", true)
      .eq("pause_type", "illness");

    if (pauseUpdErr) {
      console.error("[process-workout-completion] pause_events update failed", pauseUpdErr.message);
      // user_status je već save-ovan; log-uj ali ne fail-uj request
      // (pause_events update je sekundarni — status_json već reflektuje da je
      // activePauseEvent=null). Trener dashboard može da prikaže stale red dok
      // se ne retry-uje; biology-critical path (calorie sync) već radi dobro.
      return jsonResponse(HDRS, {
        ok: true,
        queueAdvanced: true,
        pauseJustEnded: true,
        status: newStatus,
        warning: "pause_events update failed",
      });
    }
  }

  // 13. Vrati novi status
  return jsonResponse(HDRS, {
    ok: true,
    queueAdvanced: true,
    pauseJustEnded,
    status: newStatus,
  });
});
