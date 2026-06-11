// signup-confirmed — server-side signup koji preskace Supabase email confirmation
// flow potpuno (per Mihajlo, 2026-05-06: "necu uopste da je potrebno potvrdjivanje").
// Koristi auth.admin.createUser sa email_confirm:true — nikakav mail se ne salje,
// nema rate limit-a, klijent moze odmah da radi signInWithPassword.
//
// verify_jwt=false — javni signup endpoint (namerno).
// TODO: dodati rate limiting (npr. po IP-u) — javni endpoint bez auth-a.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

declare const Deno: { serve: (h: (r: Request) => Response | Promise<Response>) => void; env: { get: (k: string) => string | undefined } };

// CORS dolazi iz _shared/cors.ts (origin whitelist preko ALLOWED_ORIGINS)
const json = (HDRS: Record<string, string>, b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...HDRS, "Content-Type": "application/json" } });

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS headeri po request-u (origin whitelist)
  const HDRS = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: HDRS });
  if (req.method !== "POST") return json(HDRS, { error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !srk) return json(HDRS, { error: "Server misconfigured" }, 500);

  let payload: { email?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return json(HDRS, { error: "Invalid JSON" }, 400);
  }

  if (!payload.email || !payload.email.includes("@")) return json(HDRS, { error: "Invalid email" }, 400);
  if (!payload.password || payload.password.length < 6) return json(HDRS, { error: "Password too short" }, 400);

  const admin = createClient(url, srk);
  const { data, error } = await admin.auth.admin.createUser({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    email_confirm: true,
  });

  if (error) {
    // Ne echo-ujemo raw error.message — "already registered" tip poruke
    // omogućava account enumeration. Detalji idu u server log.
    console.error("[signup-confirmed] createUser failed", error.message);
    return json(HDRS, { error: "Signup failed" }, 400);
  }
  if (!data.user) {
    console.error("[signup-confirmed] createUser returned no user");
    return json(HDRS, { error: "Signup failed" }, 500);
  }

  return json(HDRS, { ok: true, userId: data.user.id });
});
