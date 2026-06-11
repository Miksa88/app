// ============================================================================
// Edge Function: daily-push-reminders
// ============================================================================
//
// Cron schedule: svaki dan u 08:00 UTC (Supabase cron job).
// Šalje "Dobro jutro" push svim aktivnim user-ima sa kontekstom dana:
//   - Trening dan: "Dobro jutro 💪 — danas je trening dan"
//   - Rest dan:    "Dobro jutro ☀️ — fokus na ishranu i odmor danas"
//   - Refeed dan:  "Dobro jutro 🥐 — dan punjenja, više hidrata"
//   - Diet break:  "Dobro jutro 🍳 — pauza od dijete"
//
// Auth: x-cron-secret header.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const Deno: {
  serve: (h: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (k: string) => string | undefined };
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");

interface UserStatusRow {
  client_id: string;
  status_json: {
    training?: {
      isInDeload?: boolean;
      dietBreakActive?: boolean;
      nextSessionPartition?: string;
    };
    nutrition?: {
      activeRefeedDay?: boolean;
    };
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function buildMessage(status: UserStatusRow["status_json"]): { title: string; body: string; tag: string } {
  if (status.training?.dietBreakActive) {
    return {
      title: "Dobro jutro 🍳",
      body: "Pauza od dijete — jedi normalno, treniraj lakše. Posle ide sledeći blok.",
      tag: "dailyMorning",
    };
  }
  if (status.nutrition?.activeRefeedDay) {
    return {
      title: "Dobro jutro 🥐",
      body: "Dan punjenja — više hidrata, manje masti. Sutra normalno.",
      tag: "dailyMorning",
    };
  }
  if (status.training?.isInDeload) {
    return {
      title: "Dobro jutro 🌅",
      body: "Lakša nedelja — odmor i regeneracija. Sledeća nedelja kreće jako.",
      tag: "dailyMorning",
    };
  }
  // Default: trening day status check
  const isTrainingDay = Boolean(status.training?.nextSessionPartition);
  if (isTrainingDay) {
    return {
      title: "Dobro jutro 💪",
      body: "Danas je trening dan. Spremna si — algoritam te vodi.",
      tag: "dailyMorning",
    };
  }
  return {
    title: "Dobro jutro ☀️",
    body: "Fokus na ishranu i odmor danas. Telo se gradi između treninga.",
    tag: "dailyMorning",
  };
}

Deno.serve(async (req) => {
  // Auth — fail-loud pattern (isti kao mesocycle-tick): ne-konfigurisan
  // CRON_SECRET je server greška (500), pogrešan secret je 403.
  if (!CRON_SECRET) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== CRON_SECRET) {
    return jsonResponse({ error: "unauthorized" }, 403);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Učitaj sve klijentkinje koje imaju aktivan push subscription
  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("enabled", true);
  if (subsErr) {
    // Detalji idu u server log, caller dobija generičku poruku
    console.error("[daily-push-reminders] push_subscriptions fetch failed", subsErr.message);
    return jsonResponse({ error: "push_subscriptions fetch failed" }, 500);
  }

  const uniqueUserIds = Array.from(new Set((subs ?? []).map((s) => s.user_id as string)));
  if (uniqueUserIds.length === 0) {
    return jsonResponse({ ok: true, pushed: 0, skipped: 0 });
  }

  // Učitaj user_status za sve njih jednim query-jem
  const { data: statuses, error: statusErr } = await admin
    .from("user_status")
    .select("client_id, status_json")
    .in("client_id", uniqueUserIds);
  if (statusErr) {
    console.error("[daily-push-reminders] user_status fetch failed", statusErr.message);
    return jsonResponse({ error: "user_status fetch failed" }, 500);
  }

  let pushed = 0;
  let failed = 0;

  // Pošalji u sequence (može i parallel ali EF max execution = 60s; sekvenca je sigurnija)
  for (const row of (statuses ?? []) as UserStatusRow[]) {
    const msg = buildMessage(row.status_json ?? {});
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          userId: row.client_id,
          title: msg.title,
          body: msg.body,
          tag: msg.tag,
          url: "/home",
        }),
      });
      if (r.ok) pushed++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return jsonResponse({ ok: true, pushed, failed, total: uniqueUserIds.length });
});
