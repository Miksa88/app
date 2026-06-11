// ============================================================================
// Edge Function: mesocycle-tick (IT-15)
// ============================================================================
//
// CRON-TRIGGER-ABLE endpoint. Zaduzen za automatizaciju lifecycle rollover-a
// kroz sve aktivne klijentkinje:
//
//   1. Ako je queue iscrpljen (pointer >= sessions.length) → rolluj novi
//      mezociklus preko handleMesocycleEnd (sa deload week flag-om).
//   2. Ako je klijentkinja na poslednjoj nedelji mezociklusa i `isInDeload`
//      nije jos postavljen → postavi ga. Rule 3 (deload sync) ce automatski
//      prebaciti nutrition na maintenance posle sledeceg applyDailyCheckIn.
//   3. Ako je `isInDeload=true` a trenutni mikrociklus vise nije poslednji
//      (znaci rollover se desio) → skini flag.
//
// Ulaz (POST JSON, svi polja opcionalna):
//   { clientIds?: string[] }
//
// Ako `clientIds` prisutan → proces samo tih user_status redova.
// Inace → svi user_status redovi.
//
// AUTH — service_role only:
//   Ovo je backend cron pattern, ne user-facing request. Pragmaticno:
//   proverava `x-cron-secret` header koji se uporedjuje sa
//   `Deno.env.get("CRON_SECRET")`. Ako env var ne postoji → 500
//   (misconfigured). Ako header ne matchuje → 403.
//
// Odgovor (200):
//   {
//     ok: true,
//     processed: <int>,
//     mesocyclesRolled: <int>,
//     deloadsStarted: <int>,
//     deloadsEnded: <int>,
//     errors: [{ clientId, reason }]   // neblokirajuce greske po klijentkinji
//   }
//
// Spec reference:
//   01_TRAINING_FLOW_MASTER.md §6.1 (Makrociklus default — 4+1 deload)
//   03_INTEGRATION_LAYER.md §3.2 Rule 3 (deload sync)
//   RALPH_PLAN.md IT-15
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  getMesocycleWeeks,
  handleMesocycleEnd,
  hasMesocycleEnded,
  shouldStartDeload,
  type CalorieTargetMode,
  type MesocycleQueue,
  type SessionSkeleton,
  type ExperienceLevel,
} from "../_shared/mesocycleLifecycle.ts";

// Deno ambient (edge-runtime.d.ts donosi Deno.serve + Deno.env)
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// pocetnici.md §2.1: beginner = 7 nedelja (6+1).
// SREDNJE_NAPREDNE_V2 §2.1: intermediate = 6 nedelja (5+1).
// Per-row weeks count se izvodi iz status.bio.experienceLevel preko
// getMesocycleWeeks().

// ----------------------------------------------------------------------------
// Types — opaque shape koji citamo iz status_json JSONB-a
// ----------------------------------------------------------------------------

interface UserStatusTrainingShape {
  activeTemplateId: string;
  daysPerWeek: 3 | 4 | 5;
  queue: MesocycleQueue;
  sessionPointer: number;
  isInDeload: boolean;
  currentMesocycleIndex: number;
  currentMicrocycleIndex: number;
  // SREDNJE_NAPREDNE_V2 §5.4: Diet Break tracking
  dietBreakActive?: boolean;
  dietBreakStartedAt?: string | null;
  mesocyclesSinceDietBreak?: number;
  [key: string]: unknown;
}

interface UserStatusNutritionShape {
  targetMode: CalorieTargetMode;
  [key: string]: unknown;
}

interface UserStatusBioShape {
  experienceLevel?: ExperienceLevel;
  [key: string]: unknown;
}

interface UserStatusShape {
  clientId: string;
  bio: UserStatusBioShape;
  training: UserStatusTrainingShape;
  nutrition: UserStatusNutritionShape;
  [key: string]: unknown;
}

interface TickPayload {
  clientIds?: string[];
}

// ----------------------------------------------------------------------------
// CORS helpers (nije striktno potrebno za cron, ali drzimo konzistentnost)
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
// Validacija payload-a
// ----------------------------------------------------------------------------

function validatePayload(p: unknown): TickPayload | string {
  if (p == null) return {};
  if (typeof p !== "object") return "Body mora biti JSON objekat ili prazan";
  const o = p as Record<string, unknown>;

  if (o.clientIds != null) {
    if (!Array.isArray(o.clientIds)) return "clientIds mora biti niz";
    if (!o.clientIds.every((id) => typeof id === "string")) {
      return "clientIds mora biti niz stringova";
    }
    return { clientIds: o.clientIds as string[] };
  }

  return {};
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS headeri po request-u (origin whitelist + x-cron-secret)
  const HDRS = corsHeaders(req, "x-cron-secret");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: HDRS });
  }

  if (req.method !== "POST") {
    return jsonResponse(HDRS, { error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(HDRS, { error: "Server misconfigured (supabase env)" }, 500);
  }

  if (!cronSecret) {
    // Ne-konfigurisan secret je security failure — ne dozvoljavamo default
    // allow, cron-trigger mora biti eksplicitno podesen.
    return jsonResponse(HDRS, { error: "Server misconfigured (CRON_SECRET missing)" }, 500);
  }

  // Auth — cron secret header match
  const providedSecret = req.headers.get("x-cron-secret");
  if (providedSecret !== cronSecret) {
    return jsonResponse(HDRS, { error: "Forbidden" }, 403);
  }

  // Parse payload (opcioni)
  let payload: TickPayload;
  try {
    const text = await req.text();
    const body = text.length > 0 ? JSON.parse(text) : {};
    const validated = validatePayload(body);
    if (typeof validated === "string") {
      return jsonResponse(HDRS, { error: validated }, 400);
    }
    payload = validated;
  } catch {
    return jsonResponse(HDRS, { error: "Invalid JSON" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Ucitaj user_status redove
  let statusQuery = admin.from("user_status").select("client_id, status_json");
  if (payload.clientIds && payload.clientIds.length > 0) {
    statusQuery = statusQuery.in("client_id", payload.clientIds);
  }

  const { data: statusRows, error: statusErr } = await statusQuery;
  if (statusErr) {
    // Detalji idu u server log, caller dobija generičku poruku
    console.error("[mesocycle-tick] user_status fetch failed", statusErr.message);
    return jsonResponse(HDRS, { error: "user_status fetch failed" }, 500);
  }

  if (!statusRows || statusRows.length === 0) {
    return jsonResponse(HDRS, {
      ok: true,
      processed: 0,
      mesocyclesRolled: 0,
      deloadsStarted: 0,
      deloadsEnded: 0,
      errors: [],
    });
  }

  // 2. Prikupi sve template ID-ove koji su potrebni i ucitaj u jednom query-ju
  const templateIds = Array.from(
    new Set(
      (statusRows as Array<{ status_json: UserStatusShape }>)
        .map((r) => r.status_json?.training?.activeTemplateId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const templatesById = new Map<string, { skeleton: SessionSkeleton }>();
  if (templateIds.length > 0) {
    const { data: templateRows, error: templateErr } = await admin
      .from("session_templates")
      .select("id, skeleton")
      .in("id", templateIds);

    if (templateErr) {
      console.error("[mesocycle-tick] session_templates fetch failed", templateErr.message);
      return jsonResponse(HDRS, { error: "session_templates fetch failed" }, 500);
    }

    for (const row of (templateRows ?? []) as Array<{
      id: string;
      skeleton: unknown;
    }>) {
      templatesById.set(row.id, { skeleton: row.skeleton as SessionSkeleton });
    }
  }

  // 3. Iteriraj po klijentkinjama
  let mesocyclesRolled = 0;
  let deloadsStarted = 0;
  let deloadsEnded = 0;
  const errors: Array<{ clientId: string; reason: string }> = [];

  for (const row of statusRows as Array<{
    client_id: string;
    status_json: UserStatusShape;
  }>) {
    const status = row.status_json;
    if (!status?.training) {
      errors.push({
        clientId: row.client_id,
        reason: "Missing training section",
      });
      continue;
    }

    const training = status.training;
    const nutrition = status.nutrition;
    const queue = training.queue;
    const targetMode: CalorieTargetMode = nutrition?.targetMode ?? "maintenance";

    let newStatus: UserStatusShape | null = null;

    // 3a. Rollover ako je queue iscrpljen
    if (hasMesocycleEnded(queue)) {
      const template = templatesById.get(training.activeTemplateId);
      if (!template) {
        errors.push({
          clientId: row.client_id,
          reason: `Template ${training.activeTemplateId} not found`,
        });
        continue;
      }

      try {
        const experienceLevel: ExperienceLevel =
          status.bio?.experienceLevel ?? "intermediate";
        const mesocycleWeeks = getMesocycleWeeks(experienceLevel);
        const { newQueue, mesocycleJustEnded } = handleMesocycleEnd(
          queue,
          {
            experienceLevel,
            daysPerWeek: training.daysPerWeek,
            activeTemplateId: training.activeTemplateId,
          },
          template.skeleton,
          mesocycleWeeks,
        );

        if (mesocycleJustEnded) {
          // SREDNJE_NAPREDNE_V2 §5.4: brojač mezociklusa od poslednjeg Diet Break-a.
          // Posle 4. mezociklusa (intermediate) → auto-trigger 2-nedeljni Diet Break.
          const prevCount = training.mesocyclesSinceDietBreak ?? 0;
          const newCount = prevCount + 1;
          const triggerDietBreak =
            experienceLevel === "intermediate" && newCount >= 4 && !training.dietBreakActive;

          newStatus = {
            ...status,
            training: {
              ...training,
              queue: newQueue,
              sessionPointer: newQueue.sessionPointer,
              currentMesocycleIndex: training.currentMesocycleIndex + 1,
              currentMicrocycleIndex: 0,
              isInDeload: false,
              mesocyclesSinceDietBreak: triggerDietBreak ? 0 : newCount,
              dietBreakActive: triggerDietBreak ? true : training.dietBreakActive,
              dietBreakStartedAt: triggerDietBreak
                ? new Date().toISOString()
                : training.dietBreakStartedAt ?? null,
            },
          };
          mesocyclesRolled += 1;
        }
      } catch (err) {
        errors.push({
          clientId: row.client_id,
          reason: `handleMesocycleEnd failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
        continue;
      }
    } else {
      // 3b. Deload flag management (samo ako nismo upravo rollovali)
      const experienceLevel: ExperienceLevel =
        status.bio?.experienceLevel ?? "intermediate";
      const deloadDecision = shouldStartDeload(
        training.currentMicrocycleIndex,
        getMesocycleWeeks(experienceLevel),
        targetMode,
      );

      if (deloadDecision.shouldStart && !training.isInDeload) {
        newStatus = {
          ...status,
          training: { ...training, isInDeload: true },
        };
        deloadsStarted += 1;
      } else if (!deloadDecision.shouldStart && training.isInDeload) {
        // Deload je bio aktivan, a sad ne bi trebalo (rollover proao ili
        // microcycleIndex vise nije poslednji) — skini flag.
        newStatus = {
          ...status,
          training: { ...training, isInDeload: false },
        };
        deloadsEnded += 1;
      }
    }

    // 3d. Diet Break auto-clear posle 14 dana (SREDNJE_NAPREDNE_V2 §5.4)
    const trainingForDb =
      (newStatus?.training ?? training) as UserStatusTrainingShape;
    if (trainingForDb.dietBreakActive && trainingForDb.dietBreakStartedAt) {
      const startedAt = new Date(trainingForDb.dietBreakStartedAt);
      const daysElapsed =
        (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysElapsed >= 14) {
        newStatus = {
          ...(newStatus ?? status),
          training: {
            ...trainingForDb,
            dietBreakActive: false,
            dietBreakStartedAt: null,
          },
        };
      }
    }

    // 3c. Upsert ako ima promene
    if (newStatus) {
      const { error: upsertErr } = await admin
        .from("user_status")
        .update({
          status_json: newStatus,
          last_updated_at: new Date().toISOString(),
        })
        .eq("client_id", row.client_id);

      if (upsertErr) {
        errors.push({
          clientId: row.client_id,
          reason: `user_status update failed: ${upsertErr.message}`,
        });
      }
    }
  }

  return jsonResponse(HDRS, {
    ok: true,
    processed: statusRows.length,
    mesocyclesRolled,
    deloadsStarted,
    deloadsEnded,
    errors,
  });
});
