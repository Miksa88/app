// ============================================================================
// authClient.ts — authenticated Supabase klijent sa test user JWT-om
// ============================================================================
//
// Koristi se za direktne EF invoke-ove u testovima gde UI flow nije fokus.
// Npr. process-workout-completion ima kompleksan UI flow (queue +
// ActiveWorkout + exercise slots), ali na backend-u je samo jedan POST;
// direktan invoke sa test user JWT-om verifikuje backend end-to-end.
// ============================================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

let cachedClient: SupabaseClient | null = null;
let cachedAccessToken: string | null = null;

/** Clear session cache — za testove koji menjaju profile.role. */
export function resetAuthClient(): void {
  cachedClient = null;
  cachedAccessToken = null;
}

/**
 * Vraća supabase klijent ulogovan kao test user. Cache-uje session između
 * poziva u istom test run-u.
 */
export async function getAuthenticatedClient(): Promise<SupabaseClient> {
  if (cachedClient && cachedAccessToken) return cachedClient;

  const email = process.env.E2E_TEST_USER_EMAIL!;
  const password = process.env.E2E_TEST_USER_PASSWORD!;

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`[authClient] signIn failed: ${error?.message ?? "no session"}`);
  }

  cachedClient = client;
  cachedAccessToken = data.session.access_token;
  return client;
}

/** Direktno poziva EF sa ulogovanim JWT-om; vraća parsiran JSON response. */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: unknown,
): Promise<{ status: number; data: T | null; error: string | null }> {
  const client = await getAuthenticatedClient();
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) {
    return {
      status: (error as { status?: number }).status ?? 500,
      data: null,
      error: error.message ?? String(error),
    };
  }
  return { status: 200, data: data as T, error: null };
}
