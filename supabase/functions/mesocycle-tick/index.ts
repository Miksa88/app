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
import {
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

// Model B (Mihajlo/Ivana, 2026-05-04): 4 load + 1 deload = 5 nedelja po ciklusu.
// Spec 01_TRAINING_FLOW_MASTER.md §6.1 line 1178.
const MESOCYCLE_WEEKS = 5;

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

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server misconfigured (supabase env)" }, 500);
  }

  if (!cronSecret) {
    // Ne-konfigurisan secret je security failure — ne dozvoljavamo default
    // allow, cron-trigger mora biti eksplicitno podesen.
    return jsonResponse({ error: "Server misconfigured (CRON_SECRET missing)" }, 500);
  }

  // Auth — cron secret header match
  const providedSecret = req.headers.get("x-cron-secret");
  if (providedSecret !== cronSecret) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // Parse payload (opcioni)
  let payload: TickPayload;
  try {
    const text = await req.text();
    const body = text.length > 0 ? JSON.parse(text) : {};
    const validated = validatePayload(body);
    if (typeof validated === "string") {
      return jsonResponse({ error: validated }, 400);
    }
    payload = validated;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 1. Ucitaj user_status redove
  let statusQuery = admin.from("user_status").select("client_id, status_json");
  if (payload.clientIds && payload.clientIds.length > 0) {
    statusQuery = statusQuery.in("client_id", payload.clientIds);
  }

  const { data: statusRows, error: statusErr } = await statusQuery;
  if (statusErr) {
    return jsonResponse(
      { error: `user_status fetch failed: ${statusErr.message}` },
      500,
    );
  }

  if (!statusRows || statusRows.length === 0) {
    return jsonResponse({
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
      return jsonResponse(
        { error: `session_templates fetch failed: ${templateErr.message}` },
        500,
      );
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
        const { newQueue, mesocycleJustEnded } = handleMesocycleEnd(
          queue,
          {
            experienceLevel,
            daysPerWeek: training.daysPerWeek,
            activeTemplateId: training.activeTemplateId,
          },
          template.skeleton,
          MESOCYCLE_WEEKS,
        );

        if (mesocycleJustEnded) {
          newStatus = {
            ...status,
            training: {
              ...training,
              queue: newQueue,
              sessionPointer: newQueue.sessionPointer,
              currentMesocycleIndex: training.currentMesocycleIndex + 1,
              currentMicrocycleIndex: 0,
              isInDeload: false,
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
      const deloadDecision = shouldStartDeload(
        training.currentMicrocycleIndex,
        MESOCYCLE_WEEKS,
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

  return jsonResponse({
    ok: true,
    processed: statusRows.length,
    mesocyclesRolled,
    deloadsStarted,
    deloadsEnded,
    errors,
  });
});
