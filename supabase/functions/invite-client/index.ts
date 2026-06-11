// ============================================================================
// invite-client — trainer kreira shell client + šalje magic-link invite
// ============================================================================
//
// Poziva ga AddClient.tsx. Tok:
//   1. Verifikuj caller-a (trainer role).
//   2. auth.admin.inviteUserByEmail(email) → kreira auth.users + šalje email.
//   3. INSERT profiles row sa pre-filled trener podacima (role='client').
//   4. Vrati { userId, email }.
//
// Sigurnost: samo trainer-i mogu da pozivaju. RLS na profiles ne dozvoljava
// trener-u direktan INSERT za drugog usera (FK na auth.users.id), pa zato
// koristimo service-role kroz EF.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const Deno: {
  serve: (h: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (k: string) => string | undefined };
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

interface InvitePayload {
  email: string;
  firstName?: string;
  lastName?: string;
  weight?: number;
  height?: number;
  dateOfBirth?: string;
  primaryGoal?: string;
  jobType?: string;
  workSchedule?: string;
  injuries?: string[];
  allergies?: string[];
  foodDislikes?: string[];
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !srk || !anon) return json({ error: "Server misconfigured" }, 500);

  // 1. Verify caller is trainer
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization" }, 401);

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !caller) return json({ error: "Invalid token" }, 401);

  const admin = createClient(url, srk);
  const { data: callerProfile, error: roleErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();
  if (roleErr) return json({ error: `Role check: ${roleErr.message}` }, 500);
  if (!callerProfile || callerProfile.role !== "trainer") {
    return json({ error: "Forbidden — trainers only" }, 403);
  }

  // 2. Parse + validate
  let payload: InvitePayload;
  try {
    payload = await req.json() as InvitePayload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!payload.email || !payload.email.includes("@")) {
    return json({ error: "Invalid email" }, 400);
  }

  // 3. Invite via auth admin (creates auth.users + sends magic-link)
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    payload.email,
  );
  if (inviteErr) {
    return json({ error: `Invite failed: ${inviteErr.message}` }, 500);
  }
  const newUserId = invited.user?.id;
  if (!newUserId) return json({ error: "Invite returned no user" }, 500);

  // 4. UPSERT profiles (handle_new_user trigger may have fired already)
  const profilePatch = {
    id: newUserId,
    email: payload.email,
    role: "client",
    first_name: payload.firstName ?? null,
    last_name: payload.lastName ?? null,
    current_weight: payload.weight ?? null,
    height: payload.height ?? null,
    date_of_birth: payload.dateOfBirth ?? null,
    primary_goal: payload.primaryGoal ?? null,
    job_type: payload.jobType ?? null,
    work_schedule: payload.workSchedule ?? null,
    injuries: payload.injuries ?? [],
    allergies: payload.allergies ?? [],
    food_dislikes: payload.foodDislikes ?? [],
  };
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(profilePatch, { onConflict: "id" });
  if (profileErr) {
    return json({ error: `Profile upsert: ${profileErr.message}` }, 500);
  }

  return json({ ok: true, userId: newUserId, email: payload.email });
});
