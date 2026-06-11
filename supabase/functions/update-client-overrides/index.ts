// ============================================================================
// Edge Function: update-client-overrides (IT-18)
// ============================================================================
//
// Ulaz (POST JSON):
//   {
//     clientId: "uuid",
//     overrides: { [syncRuleName]: 'active' | 'disabled' }
//   }
//
// Odgovor (200):
//   { ok: true, status: UserStatus }
//
// Odgovornosti:
//   1. JWT auth preko anon klijenta.
//   2. Role guard: auth.uid() mora imati profiles.role='trainer'.
//      (Alpha-level scope — buduca iteracija moze dodati trener-klijentkinja
//      binding proveru; za sada dovoljna je role='trainer'.)
//   3. Load `user_status` za clientId (service_role bypass-uje RLS).
//   4. Patch `status.clientOverrides` array:
//        - rule mapped to 'disabled' -> dodaj u niz (ako nije vec)
//        - rule mapped to 'active'   -> izbaci iz niza (ako postoji)
//      UserStatus tip ima `clientOverrides: SyncRuleName[]`, pa mi
//      konvertujemo input record u niz.
//   5. Upsert user_status. Vraca novi UserStatus.
//
// Spec reference:
//   03_INTEGRATION_LAYER.md §3.2 (8 Sync Rules, prvi gate clientOverrides)
//   RALPH_PLAN.md IT-18
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

type SyncRuleName =
  | "hormonal_sync"
  | "fatigue_sync"
  | "deload_sync"
  | "return_from_break_sync"
  | "hydration_first"
  | "metabolic_noise_block"
  | "illness_penalty"
  | "cycle_menstrual_ignore";

type OverrideState = "active" | "disabled";

const VALID_RULES: readonly SyncRuleName[] = [
  "hormonal_sync",
  "fatigue_sync",
  "deload_sync",
  "return_from_break_sync",
  "hydration_first",
  "metabolic_noise_block",
  "illness_penalty",
  "cycle_menstrual_ignore",
];

interface UpdateOverridesPayload {
  clientId: string;
  overrides: Partial<Record<SyncRuleName, OverrideState>>;
}

interface UserStatusShape {
  clientId: string;
  clientOverrides: SyncRuleName[];
  [key: string]: unknown;
}

// ----------------------------------------------------------------------------
// Validacija
// ----------------------------------------------------------------------------

function isValidRule(s: string): s is SyncRuleName {
  return (VALID_RULES as readonly string[]).includes(s);
}

function validatePayload(p: unknown): UpdateOverridesPayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (typeof o.clientId !== "string" || o.clientId.length === 0) {
    return "Invalid `clientId` (expected non-empty string)";
  }
  if (!o.overrides || typeof o.overrides !== "object") {
    return "Invalid `overrides` (expected object)";
  }

  const overridesIn = o.overrides as Record<string, unknown>;
  const overrides: Partial<Record<SyncRuleName, OverrideState>> = {};

  for (const [key, val] of Object.entries(overridesIn)) {
    if (!isValidRule(key)) {
      return `Invalid sync rule name: \`${key}\``;
    }
    if (val !== "active" && val !== "disabled") {
      return `Invalid state for \`${key}\` (expected 'active' | 'disabled')`;
    }
    overrides[key] = val;
  }

  return {
    clientId: o.clientId,
    overrides,
  };
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
  const trainerId = userData.user.id;

  // 2. Parse + validate payload
  let payload: UpdateOverridesPayload;
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

  // 3. Role guard: samo trener sme da mutira clientOverrides.
  //    Alpha: provera samo role='trainer'. Buduca iteracija moze dodati
  //    trener-klijentkinja binding check.
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: profileData, error: profileErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", trainerId)
    .maybeSingle();

  if (profileErr) {
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[update-client-overrides] profile load failed", profileErr.message);
    return jsonResponse(HDRS, { error: "profile load failed" }, 500);
  }
  if (!profileData || profileData.role !== "trainer") {
    return jsonResponse(HDRS,
      { error: "Forbidden: caller is not a trainer" },
      403,
    );
  }

  // 4. Load current user_status za klijentkinju
  const { data: rowData, error: loadErr } = await admin
    .from("user_status")
    .select("client_id, status_json")
    .eq("client_id", payload.clientId)
    .maybeSingle();

  if (loadErr) {
    console.error("[update-client-overrides] user_status load failed", loadErr.message);
    return jsonResponse(HDRS, { error: "user_status load failed" }, 500);
  }
  if (!rowData?.status_json) {
    return jsonResponse(HDRS,
      { error: "user_status not found for client" },
      404,
    );
  }

  const status = rowData.status_json as UserStatusShape;
  const currentSet = new Set<SyncRuleName>(
    Array.isArray(status.clientOverrides) ? status.clientOverrides : [],
  );

  // 5. Patch: disabled => add, active => remove
  for (const [rule, state] of Object.entries(payload.overrides) as Array<
    [SyncRuleName, OverrideState]
  >) {
    if (state === "disabled") {
      currentSet.add(rule);
    } else {
      currentSet.delete(rule);
    }
  }

  // Stabilan redosled (ispratiti VALID_RULES redosled za deterministicki snapshot)
  const newOverrides: SyncRuleName[] = VALID_RULES.filter((r) =>
    currentSet.has(r),
  );

  const nowIso = new Date().toISOString();
  const newStatus: UserStatusShape = {
    ...status,
    clientOverrides: newOverrides,
    lastUpdatedAt: nowIso,
  };

  const { error: upsertErr } = await admin.from("user_status").upsert(
    {
      client_id: payload.clientId,
      status_json: newStatus,
      last_updated_at: nowIso,
    },
    { onConflict: "client_id" },
  );

  if (upsertErr) {
    console.error("[update-client-overrides] user_status upsert failed", upsertErr.message);
    return jsonResponse(HDRS, { error: "user_status upsert failed" }, 500);
  }

  return jsonResponse(HDRS, {
    ok: true,
    status: newStatus,
  });
});
