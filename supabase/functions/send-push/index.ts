// ============================================================================
// Edge Function: send-push
// ============================================================================
//
// Šalje Web Push notifikaciju na sve aktivne subscription-e za user-a.
//
// Auth: x-cron-secret header za cron pozive ILI service_role JWT za internal
// pozive iz drugih EF-ova (npr. mesocycle-tick triggera "Vreme za trening").
//
// Ulaz (POST JSON):
//   {
//     userId: string,             // target user
//     title: string,              // notif title
//     body: string,               // notif body
//     url?: string,               // klik → otvori url (default '/')
//     tag?: string,               // dedup tag (npr. 'workout-reminder')
//     icon?: string               // url do ikone
//   }
//
// Odgovor (200):
//   { ok: true, sent: <int>, failed: <int> }
//
// Autorizacija + send via Web Push protocol (RFC 8030 + VAPID RFC 8292).
// Implementacija: native fetch + Web Crypto API (Deno-friendly, no npm deps).
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const Deno: {
  serve: (h: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@fitbyivana.com";
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return jsonResponse({ error: "vapid_not_configured" }, 500);
  }

  // Auth — cron secret ili service role (od EF-a).
  // NAPOMENA (security): `CRON_SECRET &&` guard je namerno — ako env var nije
  // setovan, cron path NIKAD ne autorizuje (undefined === undefined ne sme da
  // prođe). Ne menjati u prosto poređenje bez ovog guard-a.
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = CRON_SECRET && cronSecret === CRON_SECRET;
  const isServiceRole = authHeader.includes(SERVICE_ROLE_KEY);
  if (!isCron && !isServiceRole) return jsonResponse({ error: "unauthorized" }, 403);

  const payload = (await req.json()) as PushPayload;
  if (!payload.userId || !payload.title || !payload.body) {
    return jsonResponse({ error: "invalid_payload" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", payload.userId)
    .eq("enabled", true);
  if (error) {
    // Detalji idu u server log, caller dobija generičku poruku
    console.error("[send-push] push_subscriptions fetch failed", error.message);
    return jsonResponse({ error: "db_error" }, 500);
  }
  if (!subs || subs.length === 0) return jsonResponse({ ok: true, sent: 0, failed: 0 });

  const notifBody = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag,
    icon: payload.icon,
  });

  let sent = 0;
  let failed = 0;
  for (const sub of subs as SubscriptionRow[]) {
    try {
      const ok = await sendWebPush(sub, notifBody);
      if (ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  // Touch last_pushed_at za uspešno poslane (best-effort)
  if (sent > 0) {
    await admin
      .from("push_subscriptions")
      .update({ last_pushed_at: new Date().toISOString() })
      .eq("user_id", payload.userId);
  }

  return jsonResponse({ ok: true, sent, failed });
});

// ============================================================================
// Web Push send via VAPID + RFC 8030
// ============================================================================
//
// Minimalna implementacija — koristi `webpush.send()` od Deno-friendly
// portovane biblioteke. Za sad: pošalji jednostavan request (no payload
// encryption) — production-ready varijanta zahteva ECE encryption (RFC 8188)
// koju Deno nativno podržava preko Web Crypto API-ja.
// ============================================================================

async function sendWebPush(
  sub: SubscriptionRow,
  payload: string,
): Promise<boolean> {
  // PROD-ready: koristi `web-push-deno` npm port preko esm.sh
  // Ovde minimalni placeholder — VAPID JWT + POST.
  // (Za potpunu enkripciju payload-a, koristi `npm:web-push` u Deno preko esm.sh)
  try {
    const { default: webpush } = await import("npm:web-push@3.6.7");
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
    return true;
  } catch (err) {
    console.error("web-push send failed:", err);
    return false;
  }
}
