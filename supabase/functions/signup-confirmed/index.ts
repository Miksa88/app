// signup-confirmed — server-side signup koji preskace Supabase email confirmation
// flow potpuno (per Mihajlo, 2026-05-06: "necu uopste da je potrebno potvrdjivanje").
// Koristi auth.admin.createUser sa email_confirm:true — nikakav mail se ne salje,
// nema rate limit-a, klijent moze odmah da radi signInWithPassword.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const Deno: { serve: (h: (r: Request) => Response | Promise<Response>) => void; env: { get: (k: string) => string | undefined } };

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !srk) return json({ error: "Server misconfigured" }, 500);

  let payload: { email?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!payload.email || !payload.email.includes("@")) return json({ error: "Invalid email" }, 400);
  if (!payload.password || payload.password.length < 6) return json({ error: "Password too short" }, 400);

  const admin = createClient(url, srk);
  const { data, error } = await admin.auth.admin.createUser({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    email_confirm: true,
  });

  if (error) return json({ error: error.message }, 400);
  if (!data.user) return json({ error: "No user returned" }, 500);

  return json({ ok: true, userId: data.user.id });
});
