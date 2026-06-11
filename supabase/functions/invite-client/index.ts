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
  // CORS headeri po request-u (origin whitelist)
  const HDRS = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: HDRS });
  if (req.method !== "POST") return json(HDRS, { error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !srk || !anon) return json(HDRS, { error: "Server misconfigured" }, 500);

  // 1. Verify caller is trainer
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(HDRS, { error: "Missing Authorization" }, 401);

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !caller) return json(HDRS, { error: "Invalid token" }, 401);

  const admin = createClient(url, srk);
  const { data: callerProfile, error: roleErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();
  if (roleErr) {
    // Detalji idu u server log, klijent dobija generičku poruku
    console.error("[invite-client] role check failed", roleErr.message);
    return json(HDRS, { error: "Role check failed" }, 500);
  }
  if (!callerProfile || callerProfile.role !== "trainer") {
    return json(HDRS, { error: "Forbidden — trainers only" }, 403);
  }

  // 2. Parse + validate
  let payload: InvitePayload;
  try {
    payload = await req.json() as InvitePayload;
  } catch {
    return json(HDRS, { error: "Invalid JSON" }, 400);
  }
  if (!payload.email || !payload.email.includes("@")) {
    return json(HDRS, { error: "Invalid email" }, 400);
  }

  // 3. Invite via auth admin (creates auth.users + sends magic-link)
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    payload.email,
  );
  if (inviteErr) {
    // Ne echo-ujemo raw poruku (može da otkrije postojanje naloga / interne detalje)
    console.error("[invite-client] inviteUserByEmail failed", inviteErr.message);
    return json(HDRS, { error: "Invite failed" }, 500);
  }
  const newUserId = invited.user?.id;
  if (!newUserId) return json(HDRS, { error: "Invite failed" }, 500);

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
    console.error("[invite-client] profile upsert failed", profileErr.message);
    return json(HDRS, { error: "Profile upsert failed" }, 500);
  }

  return json(HDRS, { ok: true, userId: newUserId, email: payload.email });
});
