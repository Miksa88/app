// ============================================================================
// Edge Function: smart-cut-tick (W-1 Sprint 2 → C-1 Sprint 4, 2026-05-08)
// ============================================================================
//
// CRON-TRIGGER-ABLE endpoint koji nedeljno (npr. nedelja uveče) prolazi kroz
// sve aktivne klijentkinje i radi Smart Cut weekly evaluaciju per pocetnici.md
// §3.8 + §3.9 logical diagram.
//
// Za svaku klijentkinju:
//   1. Učita user_status (currentSmartCutStep, targetMode, ...)
//   2. Skip ako targetMode != deficit/recomposition (bulk/maintenance ne idu
//      kroz cut)
//   3. Učita weight_logs (14 dana) → computeWeightTrend
//   4. Učita exercise_progress (14 dana) → computeStrengthTrend
//   5. Učita NEAT prosek (daily_check_ins.daily_steps poslednjih 7 dana)
//   6. decideSmartCutAction → advance | maintain | blocked | emergency_refeed
//   7. Ako advance/emergency_refeed → patch user_status:
//        - currentSmartCutStep = nextStep
//        - activeRefeedDay = true (samo emergency_refeed)
//
// Pauzirane klijentkinje (Pause/Freeze, MVP_PRESET gap #1) se preskaču —
// Smart Cut ne sme da teče tokom pauze.
//
// Ulaz (POST JSON, svi polja opcionalna):
//   { clientIds?: string[] }
//
// AUTH — service_role only kroz x-cron-secret header (isti pattern kao
// mesocycle-tick).
//
// Odgovor (200):
//   {
//     ok: true,
//     processed: <int>,
//     advanced: <int>,
//     refeedsTriggered: <int>,
//     blocked: <int>,
//     skippedPaused: <int>,
//     errors: [{ clientId, reason }]
//   }
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// Pure logic: kopirano iz src/utils/nutrition/smartCut + weightTrend +
// strengthTrend (Deno port). Ovo nije najlepše, ali src/ je Vite/Node bundle
// koji ne radi u Deno edge runtime-u.

// ────────────────────────────────────────────────────────────────────────────
// Smart Cut decide (pocetnici.md §3.9)
// ────────────────────────────────────────────────────────────────────────────

const NEAT_DAILY_GATE = 10000;
const RISE_THRESHOLD = 0.03;
const FALL_THRESHOLD = 0.05;

type SmartCutStep = 0 | 1 | 2 | 3 | 4;
type StrengthTrend = 'rising' | 'stable' | 'falling';
type ExperienceLevel = 'beginner' | 'intermediate';

interface SmartCutDecisionInput {
  weightChangePctLast7Days: number;
  strengthTrend: StrengthTrend;
  currentStep: SmartCutStep;
  neatDailyAvg: number;
  experienceLevel?: ExperienceLevel;
}

type SmartCutAction =
  | { action: 'advance'; nextStep: SmartCutStep; reason: string }
  | { action: 'maintain'; reason: string }
  | { action: 'blocked'; reason: string }
  | { action: 'emergency_refeed'; reason: string };

function decideSmartCutAction(input: SmartCutDecisionInput): SmartCutAction {
  if (input.neatDailyAvg < NEAT_DAILY_GATE) {
    return {
      action: 'blocked',
      reason: `NEAT prosek ${Math.round(input.neatDailyAvg)} < ${NEAT_DAILY_GATE} koraka.`,
    };
  }
  if (input.weightChangePctLast7Days < -0.3 && input.strengthTrend === 'falling') {
    return { action: 'emergency_refeed', reason: 'Vaga pada + snaga pada.' };
  }
  if (input.weightChangePctLast7Days < 0 && input.strengthTrend === 'rising') {
    return { action: 'maintain', reason: 'Idealno: vaga pada, snaga raste.' };
  }
  if (Math.abs(input.weightChangePctLast7Days) < 0.5 && input.strengthTrend === 'rising') {
    return { action: 'maintain', reason: 'Rekompozicija u toku.' };
  }
  if (input.weightChangePctLast7Days > 0.5 && input.strengthTrend !== 'rising') {
    const maxStep = input.experienceLevel === 'intermediate' ? 4 : 3;
    if (input.currentStep < maxStep) {
      const next = (input.currentStep + 1) as SmartCutStep;
      return {
        action: 'advance',
        nextStep: next,
        reason: `Vaga +${input.weightChangePctLast7Days.toFixed(1)}% — advance step ${next}.`,
      };
    }
    return {
      action: 'maintain',
      reason: `Već na Step ${maxStep}, razmotri Diet Break.`,
    };
  }
  return { action: 'maintain', reason: 'Trenutni plan stabilan.' };
}

// ────────────────────────────────────────────────────────────────────────────
// computeWeightTrend (pocetnici.md §3.9)
// ────────────────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function computeWeightChange(
  logs: Array<{ logged_at: string; weight_kg: number }>,
  now: number,
): number | null {
  if (logs.length < 2) return null;
  const cutoff7 = now - 7 * MS_PER_DAY;
  const cutoff14 = now - 14 * MS_PER_DAY;
  const current: number[] = [];
  const previous: number[] = [];
  for (const log of logs) {
    const t = new Date(log.logged_at).getTime();
    if (t > cutoff7 && t <= now) current.push(log.weight_kg);
    else if (t > cutoff14 && t <= cutoff7) previous.push(log.weight_kg);
  }
  if (current.length === 0 || previous.length === 0) return null;
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  return ((avg(current) - avg(previous)) / avg(previous)) * 100;
}

// ────────────────────────────────────────────────────────────────────────────
// computeStrengthTrend (pocetnici.md §3.9)
// ────────────────────────────────────────────────────────────────────────────

function computeStrength(
  sets: Array<{ completed_at: string; weight_kg: number; reps: number }>,
  now: number,
): StrengthTrend {
  if (sets.length === 0) return 'stable';
  const cutoff7 = now - 7 * MS_PER_DAY;
  const cutoff14 = now - 14 * MS_PER_DAY;
  let cur = 0;
  let prev = 0;
  for (const s of sets) {
    const t = new Date(s.completed_at).getTime();
    const v = s.weight_kg * s.reps;
    if (t > cutoff7 && t <= now) cur += v;
    else if (t > cutoff14 && t <= cutoff7) prev += v;
  }
  if (prev === 0) return 'stable';
  const pct = (cur - prev) / prev;
  if (pct > RISE_THRESHOLD) return 'rising';
  if (pct < -FALL_THRESHOLD) return 'falling';
  return 'stable';
}

// ────────────────────────────────────────────────────────────────────────────
// HTTP handler
// ────────────────────────────────────────────────────────────────────────────

interface RequestBody {
  clientIds?: string[];
}

interface SmartCutResult {
  processed: number;
  advanced: number;
  refeedsTriggered: number;
  blocked: number;
  skippedPaused: number;
  errors: Array<{ clientId: string; reason: string }>;
}

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS headeri po request-u (origin whitelist iz _shared/cors.ts + x-cron-secret)
  const HDRS = corsHeaders(req, "x-cron-secret");

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: HDRS,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(HDRS, { ok: false, error: "Method not allowed" }, 405);
  }

  // Auth: x-cron-secret header
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    return jsonResponse(HDRS, { ok: false, error: "CRON_SECRET not configured" }, 500);
  }
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse(HDRS, { ok: false, error: "Forbidden" }, 403);
  }

  let body: RequestBody = {};
  try {
    const raw = await req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(HDRS, { ok: false, error: "Supabase env not configured" }, 500);
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Učitaj user_status redove
  let query = supabase.from("user_status").select("client_id, status_json");
  if (body.clientIds?.length) {
    query = query.in("client_id", body.clientIds);
  }
  const { data: rows, error } = await query;
  if (error) {
    // Detalji idu u server log, caller dobija generičku poruku
    console.error("[smart-cut-tick] user_status fetch failed", error.message);
    return jsonResponse(HDRS, { ok: false, error: "user_status fetch failed" }, 500);
  }

  // Pause/Freeze (MVP_PRESET gap #1): pauzirane klijentkinje se preskaču —
  // Smart Cut evaluacija ne sme da tece dok je plan zamrznut (lazni signali:
  // vaga/snaga/NEAT podaci tokom pauze nisu reprezentativni).
  // Izvori pauze: user_status.training.activePauseEvent + profiles.pause_state.
  const pausedByTrainer = new Set<string>();
  {
    const ids = (rows ?? []).map((r) => r.client_id as string);
    if (ids.length > 0) {
      const { data: profileRows, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, pause_state")
        .in("id", ids);
      if (profilesErr) {
        console.error("[smart-cut-tick] profiles fetch failed", profilesErr.message);
        return jsonResponse(HDRS, { ok: false, error: "profiles fetch failed" }, 500);
      }
      for (const p of profileRows ?? []) {
        if (p.pause_state != null) pausedByTrainer.add(p.id as string);
      }
    }
  }

  const result: SmartCutResult = {
    processed: 0,
    advanced: 0,
    refeedsTriggered: 0,
    blocked: 0,
    skippedPaused: 0,
    errors: [],
  };

  const now = Date.now();
  const sevenDaysAgoIso = new Date(now - 7 * MS_PER_DAY).toISOString();
  const sevenDaysAgoDate = new Date(now - 7 * MS_PER_DAY).toISOString().slice(0, 10);
  const fourteenDaysAgoIso = new Date(now - 14 * MS_PER_DAY).toISOString();

  for (const row of rows ?? []) {
    const clientId = row.client_id as string;
    result.processed++;

    try {
      const status = row.status_json as Record<string, unknown>;
      const nutrition = (status.nutrition ?? {}) as {
        targetMode?: string;
        currentSmartCutStep?: SmartCutStep;
        activeRefeedDay?: boolean;
      };
      const training = (status.training ?? {}) as {
        position?: string;
        activePauseEvent?: unknown;
      };

      // Skip pauzirane (bilo koji izvor pauze)
      if (training.activePauseEvent || pausedByTrainer.has(clientId)) {
        result.skippedPaused++;
        continue;
      }
      const experienceLevel: 'beginner' | 'intermediate' =
        training.position?.startsWith('intermediate') ? 'intermediate' : 'beginner';
      const targetMode = nutrition.targetMode;
      const currentStep = (nutrition.currentSmartCutStep ?? 0) as SmartCutStep;

      if (targetMode !== 'deficit' && targetMode !== 'recomposition') {
        continue;
      }

      // Fetch weight logs
      const { data: weightLogs } = await supabase
        .from("weight_logs")
        .select("logged_at, weight_kg")
        .eq("user_id", clientId)
        .gte("logged_at", fourteenDaysAgoIso);

      // Fetch exercise progress
      const { data: sets } = await supabase
        .from("exercise_progress")
        .select("completed_at, weight_kg, reps")
        .eq("user_id", clientId)
        .gte("completed_at", fourteenDaysAgoIso);

      // Fetch NEAT
      const { data: stepRows } = await supabase
        .from("daily_check_ins")
        .select("daily_steps")
        .eq("user_id", clientId)
        .gte("date", sevenDaysAgoDate)
        .not("daily_steps", "is", null);

      const stepValues = (stepRows ?? [])
        .map(r => r.daily_steps)
        .filter((x): x is number => typeof x === 'number');
      const neatAvg = stepValues.length === 0
        ? 0
        : stepValues.reduce((s, x) => s + x, 0) / stepValues.length;

      const weightChange = computeWeightChange(weightLogs ?? [], now);
      if (weightChange === null) {
        continue; // nema dovoljno podataka
      }

      const strengthTrend = computeStrength(sets ?? [], now);
      const decision = decideSmartCutAction({
        weightChangePctLast7Days: weightChange,
        strengthTrend,
        currentStep,
        neatDailyAvg: neatAvg,
        experienceLevel,
      });

      if (decision.action === 'blocked') {
        result.blocked++;
        continue;
      }

      let patched = false;
      if (decision.action === 'advance') {
        nutrition.currentSmartCutStep = decision.nextStep;
        result.advanced++;
        patched = true;
      } else if (decision.action === 'emergency_refeed') {
        nutrition.activeRefeedDay = true;
        result.refeedsTriggered++;
        patched = true;
      }

      if (patched) {
        const newStatusJson = { ...status, nutrition, lastUpdatedAt: new Date().toISOString() };
        const { error: updErr } = await supabase
          .from("user_status")
          .update({
            status_json: newStatusJson,
            last_updated_at: new Date().toISOString(),
          })
          .eq("client_id", clientId);
        if (updErr) {
          result.errors.push({ clientId, reason: `update failed: ${updErr.message}` });
        }
      }
    } catch (e) {
      result.errors.push({
        clientId,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return jsonResponse(HDRS, { ok: true, ...result }, 200);
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function jsonResponse(
  HDRS: Record<string, string>,
  body: unknown,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...HDRS, "Content-Type": "application/json" },
  });
}
