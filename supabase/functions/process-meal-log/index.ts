// ============================================================================
// Edge Function: process-meal-log (IT-11)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     clientId: "uuid",
//     mealId: "meal_breakfast_001",        // IR meal struktura meal identifier
//     slotIndex: 0,                         // 0=breakfast .. 4=dinner
//     status: "logged" | "skipped" | "replaced",
//     calories: 450,
//     protein: 30,
//     carbs: 50,
//     fat: 12,
//     wasLiquidCalories?: false,            // default false
//     replacementMealId?: "meal_alt_002"    // samo ako status='replaced'
//   }
//
// Odgovor (200):
//   {
//     ok: true,
//     status: <UserStatus JSON>,
//     liquidTotal: 600,                     // suma tečnih kcal u poslednjih 24h
//     isMetabolicNoiseTriggered: true
//   }
//
// Odgovornosti:
//   1. JWT auth (anon klijent, isti pattern kao save-user-status).
//   2. Guard: `clientId === auth.uid`.
//   3. Validate payload (status / macros per-skipped invariant).
//   4. INSERT u `meal_logs` (service_role; RLS ionako dozvoljava vlasniku,
//      ali service_role je konzistentan sa ostalim EF-ovima).
//   5. SELECT user_status (service_role).
//   6. SELECT SUM(calories_actual) FROM meal_logs WHERE was_liquid_calories=TRUE
//      AND logged_at > now() - 24h (uključuje upravo ubačen red).
//   7. Ako liquid_total / currentCalorieTarget > 10% → setuj
//      `nutrition.isMetabolicNoiseTriggered = true`. Ne resetuje na false ovde
//      (to je Rule 6 posao, server ne zna da li je prošlo 3 dana od trigera).
//   8. Ako status='skipped' → increment `redFlags.skipCount7d`.
//   9. Upsert user_status (service_role).
//  10. Vrati ceo newStatus + liquidTotal + isMetabolicNoiseTriggered.
//
// NAPOMENA (razlika od process-workout-completion):
//   Ova EF NE poziva `runSyncRules` (god node, no-touch zone). IT-12 mutation
//   hook posle EF-a poziva klijent-side `runSyncRules(status)` koji će Rule 6
//   ući i postaviti `_blockProgressionUntil = +3 dana`. Na toj klijent-strani
//   se onda poziva `save-user-status` za drugi upsert sa sync-derived flag-ovima.
//
// Spec reference:
//   02_NUTRITION_FLOW_MASTER.md §5.5 (Sync Rule 6 — Metabolic Noise)
//   02_NUTRITION_FLOW_MASTER.md §13 (Daily logging, skipCount7d)
//   03_INTEGRATION_LAYER.md §3.1 (MealLog flow)
//   03_INTEGRATION_LAYER.md §3.2 Rule 6
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Deno ambient (edge-runtime.d.ts donosi Deno.serve + Deno.env)
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// ----------------------------------------------------------------------------
// Types — payload + opaque UserStatus shape
// ----------------------------------------------------------------------------

type MealLogStatus = "logged" | "skipped" | "replaced";

interface MealLogPayload {
  clientId: string;
  mealId: string;
  slotIndex: number;
  status: MealLogStatus;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  wasLiquidCalories: boolean;
  replacementMealId: string | null;
}

interface UserStatusNutritionShape {
  currentCalorieTarget: number;
  isMetabolicNoiseTriggered: boolean;
  [key: string]: unknown;
}

interface UserStatusRedFlagsShape {
  skipCount7d: number;
  [key: string]: unknown;
}

interface UserStatusShape {
  clientId: string;
  nutrition: UserStatusNutritionShape;
  redFlags: UserStatusRedFlagsShape;
  [key: string]: unknown;
}

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
// Validacija
// ----------------------------------------------------------------------------

function validatePayload(p: unknown): MealLogPayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (typeof o.clientId !== "string" || o.clientId.length === 0) {
    return "Invalid `clientId` (expected non-empty string)";
  }
  if (typeof o.mealId !== "string" || o.mealId.length === 0) {
    return "Invalid `mealId` (expected non-empty string)";
  }
  if (
    typeof o.slotIndex !== "number" ||
    !Number.isInteger(o.slotIndex) ||
    o.slotIndex < 0 ||
    o.slotIndex > 4
  ) {
    return "Invalid `slotIndex` (expected integer 0–4)";
  }
  if (
    o.status !== "logged" &&
    o.status !== "skipped" &&
    o.status !== "replaced"
  ) {
    return "Invalid `status` (expected logged|skipped|replaced)";
  }
  for (const key of ["calories", "protein", "carbs", "fat"] as const) {
    const v = o[key];
    if (typeof v !== "number" || Number.isNaN(v) || v < 0) {
      return `Invalid \`${key}\` (expected non-negative number)`;
    }
  }

  const status = o.status as MealLogStatus;

  // Mirror DB CHECK constraint: ako je 'skipped', svi makro brojevi moraju biti 0
  if (
    status === "skipped" &&
    ((o.calories as number) !== 0 ||
      (o.protein as number) !== 0 ||
      (o.carbs as number) !== 0 ||
      (o.fat as number) !== 0)
  ) {
    return "Invalid payload: skipped status requires all macros to be 0";
  }

  // Mirror DB CHECK constraint: 'replaced' traži replacementMealId; non-'replaced' ne sme imati
  const replacementMealId =
    typeof o.replacementMealId === "string" && o.replacementMealId.length > 0
      ? o.replacementMealId
      : null;

  if (status === "replaced" && replacementMealId === null) {
    return "Invalid payload: replaced status requires `replacementMealId`";
  }
  if (status !== "replaced" && replacementMealId !== null) {
    return "Invalid payload: `replacementMealId` only allowed when status='replaced'";
  }

  const wasLiquidCalories =
    typeof o.wasLiquidCalories === "boolean" ? o.wasLiquidCalories : false;

  return {
    clientId: o.clientId,
    mealId: o.mealId,
    slotIndex: o.slotIndex,
    status,
    calories: o.calories as number,
    protein: o.protein as number,
    carbs: o.carbs as number,
    fat: o.fat as number,
    wasLiquidCalories,
    replacementMealId,
  };
}

// ----------------------------------------------------------------------------
// Pure: metabolic noise detector — >10% strict
// (source of truth: src/utils/nutrition/metabolicNoise.ts, pokriveno Vitest-om)
// ----------------------------------------------------------------------------

function isMetabolicNoise(liquidKcal: number, calorieTarget: number): boolean {
  if (calorieTarget <= 0) return false;
  if (liquidKcal <= 0) return false;
  return liquidKcal / calorieTarget > 0.10;
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Server misconfigured" }, 500);
  }

  // 1. JWT auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ ok: false, error: "Missing Authorization" }, 401);
  }
  const jwt = authHeader.slice("Bearer ".length).trim();

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: userData, error: userErr } = await anonClient.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return jsonResponse({ ok: false, error: "Invalid JWT" }, 401);
  }
  const userId = userData.user.id;

  // 2. Parse + validate payload
  let payload: MealLogPayload;
  try {
    const body = await req.json();
    const validated = validatePayload(body);
    if (typeof validated === "string") {
      return jsonResponse({ ok: false, error: validated }, 400);
    }
    payload = validated;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  // 3. clientId guard
  if (payload.clientId !== userId) {
    return jsonResponse(
      { ok: false, error: "Forbidden: clientId ne odgovara auth.uid" },
      403,
    );
  }

  // 4. Service-role DB klijent
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // 5. INSERT meal_logs (per-meal audit; mapping prema IT-1 migraciji).
  //    meal_logs columns: user_id, meal_id, meal_slot_index, status,
  //    calories_actual, protein_actual, carbs_actual, fat_actual,
  //    was_liquid_calories, replacement_meal_id (+ auto id/timestamps).
  const loggedAtIso = new Date().toISOString();
  const { error: insertErr } = await admin.from("meal_logs").insert({
    user_id: userId,
    meal_id: payload.mealId,
    meal_slot_index: payload.slotIndex,
    status: payload.status,
    logged_at: loggedAtIso,
    calories_actual: payload.calories,
    protein_actual: payload.protein,
    carbs_actual: payload.carbs,
    fat_actual: payload.fat,
    was_liquid_calories: payload.wasLiquidCalories,
    replacement_meal_id: payload.replacementMealId,
  });

  if (insertErr) {
    return jsonResponse(
      { ok: false, error: `meal_logs insert failed: ${insertErr.message}` },
      500,
    );
  }

  // 6. Load UserStatus
  const { data: rowData, error: loadErr } = await admin
    .from("user_status")
    .select("client_id, status_json")
    .eq("client_id", userId)
    .maybeSingle();

  if (loadErr) {
    return jsonResponse(
      { ok: false, error: `user_status load failed: ${loadErr.message}` },
      500,
    );
  }
  if (!rowData?.status_json) {
    return jsonResponse(
      { ok: false, error: "user_status not found for client" },
      404,
    );
  }

  const status = rowData.status_json as UserStatusShape;

  // 7. Aggregate liquid kcal za poslednjih 24h (uključujući upravo ubačen red).
  //    Radimo SUM na klijentskoj strani jer Supabase `select` ne nudi direktan
  //    SUM aggregate — pa fetchujemo sve relevantne redove i saberimo.
  //    U praksi u 24h prozoru ima <20 tečnih unosa, pa je ovo jeftino.
  const twentyFourHoursAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString();

  const { data: liquidRows, error: liquidErr } = await admin
    .from("meal_logs")
    .select("calories_actual")
    .eq("user_id", userId)
    .eq("was_liquid_calories", true)
    .gt("logged_at", twentyFourHoursAgoIso);

  if (liquidErr) {
    return jsonResponse(
      { ok: false, error: `liquid aggregate failed: ${liquidErr.message}` },
      500,
    );
  }

  const liquidTotal = ((liquidRows ?? []) as Array<{ calories_actual: number }>)
    .reduce((sum, r) => sum + (r.calories_actual ?? 0), 0);

  // 8. Compute isMetabolicNoiseTriggered (threshold > 10%).
  const currentCalorieTarget = status.nutrition?.currentCalorieTarget ?? 0;
  const metabolicNoiseTriggered = isMetabolicNoise(
    liquidTotal,
    currentCalorieTarget,
  );

  // 9. Compose newStatus (shallow clone; nutrition + redFlags dobijaju patch).
  //    Ne resetujemo `isMetabolicNoiseTriggered` na false ovde — to je Rule 6
  //    posao klijent-side (zna kada prozor od 3 dana prošao). Server samo
  //    postavlja na true kada threshold pređen.
  const nowIso = new Date().toISOString();

  const newNutrition: UserStatusNutritionShape = {
    ...status.nutrition,
    isMetabolicNoiseTriggered:
      metabolicNoiseTriggered || status.nutrition.isMetabolicNoiseTriggered,
  };

  // 10. Increment skipCount7d ako status='skipped'.
  //     Napomena: ovo je "soft" brojač — pravi 7-day count ide kroz SELECT
  //     redova iz meal_logs WHERE status='skipped' AND logged_at > now()-7d;
  //     ali za hot-path red flag UI-ja inkrement je jeftin signal.
  //     Trueup kroz weekly check-in (IT-17) ili dedicated scan.
  const prevSkipCount = status.redFlags?.skipCount7d ?? 0;
  const newRedFlags: UserStatusRedFlagsShape = {
    ...status.redFlags,
    skipCount7d:
      payload.status === "skipped" ? prevSkipCount + 1 : prevSkipCount,
  };

  const newStatus: UserStatusShape = {
    ...status,
    nutrition: newNutrition,
    redFlags: newRedFlags,
    lastUpdatedAt: nowIso,
  };

  // 11. Upsert user_status (service_role).
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
    return jsonResponse(
      { ok: false, error: `user_status upsert failed: ${upsertErr.message}` },
      500,
    );
  }

  // 12. Vrati novi status + aggregate.
  return jsonResponse({
    ok: true,
    status: newStatus,
    liquidTotal,
    isMetabolicNoiseTriggered: newNutrition.isMetabolicNoiseTriggered,
  });
});
