// ============================================================================
// Edge Function: process-daily-check-in (IT-4)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     date: "2026-04-23",            // YYYY-MM-DD
//     weightKg: 60.5,
//     sleepHours: 7.2,
//     stressLevel: 3,                // 1–5
//     energyLevel: 7,                // 1–10
//     waterIntakeMl: 2000,
//     cycleDay?: 12                  // 1–45, nullable
//   }
//
// Odgovor:
//   {
//     ok: true,
//     ma5: 60.2 | null,
//     reliableSampleCount: 5,
//     sleepLast7DaysAvg: 7.1 | null,
//     stressLast7DaysAvg: 2.8 | null,
//     hydrationLast7DaysAvgMl: 2050 | null
//   }
//
// Odgovornosti (compute-only — opcija A''):
//   1. Autentikacija kroz JWT iz Authorization header-a.
//   2. Upsert u `daily_check_ins` (jedan red po user+date).
//   3. Insert u `weight_logs` (source='manual').
//   4. Učitava poslednjih 14 weight log-ova + poslednjih 7 daily_check_ins.
//   5. Korelira `cycle_day` iz check-in-ova po datumu sa weight log-om.
//   6. Računa MA5 kroz pure `calcMA5` (skip menstrual 1–5).
//   7. Računa 7-day avg za sleep / stress (samo non-menstrual dani) i
//      hydration (svi dani — hidratacija nije pod-procenjena u menstrualnoj).
//   8. Vraća computed vrednosti klijentu.
//
// Namerno NE poziva `applyDailyCheckIn` ni `saveUserStatus` — taj korak je
// posao IT-5 mutation hook-a (koji patch-uje status MA5/avg vrednostima i
// poziva drugi endpoint za perzistenciju). Ovakva podela drži Edge Function
// tankim i lako testable.
//
// Spec reference:
//   02_NUTRITION_FLOW_MASTER.md §10, §13 (Daily logging, MA5)
//   03_INTEGRATION_LAYER.md §3.1 (DailyCheckIn flow), §3.2 Rule 8
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { calcMA5, type WeightSample } from "../_shared/movingAverage.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Deno ambient declaration (edge-runtime.d.ts import gives Deno.serve + Deno.env)
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// ----------------------------------------------------------------------------
// Types for payload + DB rows (lokalno definisani — Deno ne deli src/types/)
// ----------------------------------------------------------------------------

interface CheckInPayload {
  date: string;              // YYYY-MM-DD
  weightKg: number;
  sleepHours: number;
  stressLevel: number;
  energyLevel: number;
  waterIntakeMl: number;
  cycleDay?: number | null;
}

interface WeightLogRow {
  weight_kg: number;
  logged_at: string;
}

interface CheckInRow {
  date: string;              // YYYY-MM-DD
  sleep_hours: number | null;
  stress_level: number | null;
  water_intake_ml: number | null;
  cycle_day: number | null;
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

function validatePayload(p: unknown): CheckInPayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) {
    return "Invalid `date` (expected YYYY-MM-DD)";
  }
  if (typeof o.weightKg !== "number" || o.weightKg < 20 || o.weightKg > 300) {
    return "Invalid `weightKg` (20–300)";
  }
  if (typeof o.sleepHours !== "number" || o.sleepHours < 0 || o.sleepHours > 14) {
    return "Invalid `sleepHours` (0–14)";
  }
  if (typeof o.stressLevel !== "number" || o.stressLevel < 1 || o.stressLevel > 5) {
    return "Invalid `stressLevel` (1–5)";
  }
  if (typeof o.energyLevel !== "number" || o.energyLevel < 1 || o.energyLevel > 10) {
    return "Invalid `energyLevel` (1–10)";
  }
  if (typeof o.waterIntakeMl !== "number" || o.waterIntakeMl < 0) {
    return "Invalid `waterIntakeMl` (>= 0)";
  }
  if (
    o.cycleDay != null &&
    (typeof o.cycleDay !== "number" || o.cycleDay < 1 || o.cycleDay > 45)
  ) {
    return "Invalid `cycleDay` (1–45 or null)";
  }

  return {
    date: o.date,
    weightKg: o.weightKg,
    sleepHours: o.sleepHours,
    stressLevel: o.stressLevel,
    energyLevel: o.energyLevel,
    waterIntakeMl: o.waterIntakeMl,
    cycleDay: (o.cycleDay as number | null | undefined) ?? null,
  };
}

// ----------------------------------------------------------------------------
// 7-day avg helpers (non-menstrual filter za weight-sensitive metrike)
// ----------------------------------------------------------------------------

function isMenstrual(cycleDay: number | null): boolean {
  return cycleDay != null && cycleDay >= 1 && cycleDay <= 5;
}

function avgOrNull(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return Math.round((sum / nums.length) * 100) / 100;
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

  // 1. JWT auth — dobij user iz Authorization header-a kroz anon klijent.
  //    Service role ne sme da se koristi za autentikaciju (bypass-ovao bi RLS
  //    verifikaciju potpisa); anon client je pravilan pristup.
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

  // 2. Parse i validuj payload
  let payload: CheckInPayload;
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

  // 3. Service-role klijent za DB pristup (bypass RLS tamo gde nam treba —
  //    user_status u IT-5; ovde su tabele već dopuštene klijentkinji, ali
  //    koristimo service_role da bi konzistencija pisanja bila jedan writer).
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 4. Upsert daily_check_ins (jedinstveni (user_id, date))
  const { error: checkInErr } = await admin
    .from("daily_check_ins")
    .upsert(
      {
        user_id: userId,
        date: payload.date,
        sleep_hours: payload.sleepHours,
        stress_level: payload.stressLevel,
        energy_level: payload.energyLevel,
        water_intake_ml: payload.waterIntakeMl,
        cycle_day: payload.cycleDay,
      },
      { onConflict: "user_id,date" },
    );

  if (checkInErr) {
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[process-daily-check-in] daily_check_ins upsert failed", checkInErr.message);
    return jsonResponse(HDRS, { error: "daily_check_ins upsert failed" }, 500);
  }

  // 5. Insert weight_logs (append-only istorija; source=manual za ručni unos)
  const loggedAtIso = new Date(`${payload.date}T12:00:00Z`).toISOString();
  const { error: weightErr } = await admin
    .from("weight_logs")
    .insert({
      user_id: userId,
      weight_kg: payload.weightKg,
      logged_at: loggedAtIso,
      source: "manual",
    });

  if (weightErr) {
    console.error("[process-daily-check-in] weight_logs insert failed", weightErr.message);
    return jsonResponse(HDRS, { error: "weight_logs insert failed" }, 500);
  }

  // 6. Fetch istoriju: poslednjih 14 weight log-ova + 7 check-in-ova.
  //    Buffer 14 na weight strani pokriva worst case gde je polovina
  //    uzoraka u menstrualnoj fazi pa MA5 nakon skip-a i dalje ima 5.
  const { data: weightRows, error: wlErr } = await admin
    .from("weight_logs")
    .select("weight_kg, logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(14);

  if (wlErr) {
    console.error("[process-daily-check-in] weight_logs fetch failed", wlErr.message);
    return jsonResponse(HDRS, { error: "weight_logs fetch failed" }, 500);
  }

  // 7 dana unazad za avg-ove i cycle-day korelaciju
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data: checkInRows, error: ciErr } = await admin
    .from("daily_check_ins")
    .select("date, sleep_hours, stress_level, water_intake_ml, cycle_day")
    .eq("user_id", userId)
    .gte("date", sevenDaysAgo)
    .order("date", { ascending: false });

  if (ciErr) {
    console.error("[process-daily-check-in] daily_check_ins fetch failed", ciErr.message);
    return jsonResponse(HDRS, { error: "daily_check_ins fetch failed" }, 500);
  }

  const checkIns: CheckInRow[] = (checkInRows as CheckInRow[] | null) ?? [];
  const weights: WeightLogRow[] = (weightRows as WeightLogRow[] | null) ?? [];

  // 7. Korelisanje cycle_day po datumu za weight log-ove.
  //    Mapiramo daily_check_ins po YYYY-MM-DD ključu; zatim za svaki
  //    weight_log uzmemo cycleDay iz mape (ako postoji unos tog dana).
  const cycleByDate = new Map<string, number | null>();
  for (const row of checkIns) {
    cycleByDate.set(row.date.slice(0, 10), row.cycle_day);
  }

  const samples: WeightSample[] = weights.map((w) => {
    const dateKey = w.logged_at.slice(0, 10);
    return {
      weight_kg: w.weight_kg,
      logged_at: w.logged_at,
      cycleDayAtTime: cycleByDate.get(dateKey) ?? null,
    };
  });

  // 8. Compute MA5 kroz pure funkciju
  const { ma5, reliableSampleCount } = calcMA5(samples);

  // 9. Compute 7-day avg za sleep / stress — samo non-menstrual dani.
  //    Hydration ostaje na svim danima (menstrualna ne kvari vodu).
  const nonMenstrualCheckIns = checkIns.filter((r) => !isMenstrual(r.cycle_day));

  const sleepAvg = avgOrNull(nonMenstrualCheckIns.map((r) => r.sleep_hours));
  const stressAvg = avgOrNull(nonMenstrualCheckIns.map((r) => r.stress_level));
  const hydrationAvg = avgOrNull(checkIns.map((r) => r.water_intake_ml));

  // 10. Vrati computed vrednosti — IT-5 hook će pozvati applyDailyCheckIn
  //     na klijent-strani i patchovati ove vrednosti u UserStatus.
  return jsonResponse(HDRS, {
    ok: true,
    ma5,
    reliableSampleCount,
    sleepLast7DaysAvg: sleepAvg,
    stressLast7DaysAvg: stressAvg,
    hydrationLast7DaysAvgMl: hydrationAvg,
  });
});
