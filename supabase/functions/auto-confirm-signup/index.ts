// ============================================================================
// auto-confirm-signup — bypass email confirmation za beta
// ============================================================================
//
// Posle SignUpSheet.signUp, ovaj EF setuje email_confirmed_at=now() na novo
// kreiranom auth.users redu, tako da signInWithPassword odmah radi bez
// čekanja email link-a.
//
// Auth: poziva ga klijent SAMO sa userId koji je upravo dobio iz signUp
// response-a. EF verifikuje da:
//   1. userId postoji u auth.users
//   2. email_confirmed_at je NULL (još nije confirm-ovan)
//   3. created_at je u poslednjih 60 sekundi (recent signup)
// Ovo sprečava da se EF koristi za auto-confirm starih neconfirmed user-a
// (anti-takeover protection).
//
// Za produkciju: isključi ovu funkciju ili stavi domain whitelist; email
// confirmation je sigurnija praksa za stvarne korisnike.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: {
  serve: (h: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (k: string) => string | undefined };
};

// CORS dolazi iz _shared/cors.ts (origin whitelist preko ALLOWED_ORIGINS)
const json = (HDRS: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...HDRS, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS headeri po request-u (origin whitelist)
  const HDRS = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: HDRS });
  if (req.method !== "POST") return json(HDRS, { error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !srk) return json(HDRS, { error: "Server misconfigured" }, 500);

  let payload: { userId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json(HDRS, { error: "Invalid JSON" }, 400);
  }

  const userId = payload.userId;
  if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
    return json(HDRS, { error: "Invalid userId (UUID expected)" }, 400);
  }

  const admin = createClient(url, srk);

  // Find user; verify recent unconfirmed signup
  const { data: rows, error: selectErr } = await admin
    .schema("auth")
    .from("users")
    .select("id, email_confirmed_at, created_at")
    .eq("id", userId)
    .limit(1);

  if (selectErr) {
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[auto-confirm-signup] auth.users select failed", selectErr.message);
    return json(HDRS, { error: "auth.users select failed" }, 500);
  }
  if (!rows || rows.length === 0) {
    return json(HDRS, { error: "User not found" }, 404);
  }

  const u = rows[0] as { id: string; email_confirmed_at: string | null; created_at: string };

  if (u.email_confirmed_at) {
    // Already confirmed — idempotent OK
    return json(HDRS, { ok: true, alreadyConfirmed: true });
  }

  const createdAt = new Date(u.created_at).getTime();
  const ageMs = Date.now() - createdAt;
  if (ageMs > 60_000) {
    return json(HDRS,
      { error: "User created over 60s ago — auto-confirm only allowed for recent signups" },
      403,
    );
  }

  const { error: updateErr } = await admin
    .schema("auth")
    .from("users")
    .update({ email_confirmed_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateErr) {
    console.error("[auto-confirm-signup] auth.users update failed", updateErr.message);
    return json(HDRS, { error: "auth.users update failed" }, 500);
  }

  return json(HDRS, { ok: true, alreadyConfirmed: false });
});
