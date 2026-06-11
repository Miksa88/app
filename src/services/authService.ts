// ============================================================================
// authService — auth operacije za UI sloj (whitelabel Task 1.1)
// ============================================================================
//
// Pages/components ne smeju da importuju supabase client direktno — auth
// pozivi (sign-in, session poll, signup EF) idu kroz ovaj servis.
// AuthContext (infrastruktura) i dalje koristi supabase direktno.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

/**
 * Email+password sign-in. Vraća userId; baca Error sa supabase porukom
 * (prazna poruka ako user fali bez error-a — caller bira fallback tekst).
 */
export async function signInWithPassword(email: string, password: string): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    throw new Error(error?.message ?? "");
  }
  return data.user.id;
}

/** Trenutni session userId (ili null) — koristi AnalysisReport poll. */
export async function getSessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/**
 * Server-side signup preko `signup-confirmed` edge funkcije
 * (auth.admin.createUser sa email_confirm:true — bez confirmation maila).
 * Vraća error poruku ili null ako je sve ok (fail-soft, ne baca).
 */
export async function signUpConfirmed(email: string, password: string): Promise<string | null> {
  try {
    const { data: signupData, error: signupErr } = await supabase.functions.invoke(
      "signup-confirmed",
      { body: { email, password } },
    );
    if (signupErr) return signupErr.message;
    const efPayload = (signupData ?? {}) as { ok?: boolean; error?: string };
    if (!efPayload.ok) return efPayload.error ?? "EF returned no ok";
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
