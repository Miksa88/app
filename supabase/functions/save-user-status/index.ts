// ============================================================================
// Edge Function: save-user-status (IT-5)
// ============================================================================
//
// Ulaz (POST JSON):
//   { status: UserStatus }
//
// Izlaz:
//   { ok: true, status: UserStatus (posle DB roundtrip-a) }
//
// Odgovornosti:
//   1. Autentikacija kroz JWT iz Authorization header-a (anon klijent + getUser).
//   2. Bezbednosna provera: `status.clientId === auth.uid`. User može da save-uje
//      SAMO svoj status. service_role bypass-uje RLS, pa ovu proveru radimo
//      eksplicitno na Edge Function-u.
//   3. Upsert `user_status` (ON CONFLICT client_id DO UPDATE SET status_json,
//      last_updated_at) — service_role koristimo jer user_status tabela nema
//      INSERT/UPDATE policy za authenticated (spec 03 §5 — jedan writer preko
//      Edge Function-a).
//   4. Vraća novi red iz DB-a (za Realtime konzistentnost; Realtime push će i
//      tako osvežiti klijenta, ali endpoint vraća vrednost radi defensive
//      react-query cache invalidation-a u hook-u).
//
// Spec reference:
//   03_INTEGRATION_LAYER.md §2 (UserStatus), §3.1 (DailyCheckIn flow),
//   REPORT_FRONT_BACK_MISMATCH.md §5 (RLS service_role write path).
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Deno ambient (edge-runtime.d.ts import donosi Deno.serve + Deno.env)
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
// Payload validacija (minimalan shape — ne replikujemo kompletno UserStatus
// strukturiranje u Deno; serijalizacija je već odrađena na klijent-strani
// kroz `_serializeStatus`). Provera:
//   - body.status je objekat
//   - body.status.clientId je string i odgovara auth.uid-u
// ----------------------------------------------------------------------------

interface SaveUserStatusPayload {
  status: {
    clientId: string;
    // Ostala polja tretiramo kao opaque JSON — ne validujemo strukturu ovde;
    // tipovi su enforced u src/ kroz `UserStatus` interface, a Sync Engine
    // je pozivalac (u IT-5 hook-u patcher pre save-a).
    [key: string]: unknown;
  };
}

function validatePayload(p: unknown): SaveUserStatusPayload | string {
  if (!p || typeof p !== "object") return "Missing JSON body";
  const o = p as Record<string, unknown>;

  if (!o.status || typeof o.status !== "object") {
    return "Invalid `status` (expected object)";
  }

  const status = o.status as Record<string, unknown>;
  if (typeof status.clientId !== "string" || status.clientId.length === 0) {
    return "Invalid `status.clientId` (expected non-empty string)";
  }

  return { status: status as SaveUserStatusPayload["status"] };
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
  let payload: SaveUserStatusPayload;
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

  // 3. Bezbednost: user sme da save-uje samo svoj status. service_role (ispod)
  //    bypass-uje RLS pa eksplicitno verifikujemo vlasništvo pre pisanja.
  if (payload.status.clientId !== userId) {
    return jsonResponse(HDRS,
      { error: "Forbidden: status.clientId ne odgovara auth.uid" },
      403,
    );
  }

  // 4. Service-role klijent za upsert (user_status tabela nema INSERT/UPDATE
  //    policy za authenticated role — samo service_role sme da piše; Edge
  //    Function je jedini writer po Principu 1 spec-a 03).
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // lastUpdatedAt — forsiramo server vreme radi konzistencije top-level kolone
  // sa status_json kolonom (DB trigger takođe setuje, ali ovde imamo single
  // source of truth za obe).
  const nowIso = new Date().toISOString();
  const statusJson = {
    ...payload.status,
    // Payload može da sadrži lastUpdatedAt kao ISO string (JSON.stringify Date
    // vraća ISO). Overrideujemo na server now() — autoritet vremena je server.
    lastUpdatedAt: nowIso,
  };

  const { data, error: upsertErr } = await admin
    .from("user_status")
    .upsert(
      {
        client_id: userId,
        status_json: statusJson,
        last_updated_at: nowIso,
      },
      { onConflict: "client_id" },
    )
    .select("client_id, status_json, last_updated_at")
    .single();

  if (upsertErr) {
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[save-user-status] user_status upsert failed", upsertErr.message);
    return jsonResponse(HDRS, { error: "user_status upsert failed" }, 500);
  }

  // 5. Vraćamo svež DB red (Realtime push već osvežava klijenta; ovo je za
  //    defensive react-query cache update u mutation hook-u)
  return jsonResponse(HDRS, {
    ok: true,
    row: {
      client_id: data.client_id,
      status_json: data.status_json,
      last_updated_at: data.last_updated_at,
    },
  });
});
