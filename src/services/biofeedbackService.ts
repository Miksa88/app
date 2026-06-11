// ============================================================================
// biofeedbackService — dnevni biofeedback signali (whitelabel Task 1.1)
// ============================================================================
//
// Pre-workout fatigue ("Umorna/Odmorna") i post-workout 3-button feedback
// (Lako/Taman/Teško). Oba patchuju user_status.status_json.bio koji čitaju
// biofeedbackReactiveRules + programGenerator.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

// ----------------------------------------------------------------------------
// Interni helper — read-modify-write patch na status_json.bio
// ----------------------------------------------------------------------------
async function patchUserStatusBio(
  clientId: string,
  bioPatch: Record<string, unknown>,
  label: string,
): Promise<void> {
  const { data, error: readErr } = await supabase
    .from("user_status")
    .select("status_json")
    .eq("client_id", clientId)
    .single();
  if (readErr) throw new Error(`${label} read: ${readErr.message}`);

  const status = (data?.status_json ?? {}) as Record<string, unknown>;
  const bio = (status.bio ?? {}) as Record<string, unknown>;
  const newStatus = { ...status, bio: { ...bio, ...bioPatch } };

  const { error: writeErr } = await supabase
    .from("user_status")
    .update({ status_json: newStatus, last_updated_at: new Date().toISOString() })
    .eq("client_id", clientId);
  if (writeErr) throw new Error(`${label} write: ${writeErr.message}`);
}

/**
 * Pre-workout fatigue signal — "Umorna" → algoritam forsira MAINTAIN.
 * Direct patch na user_status.status_json — bio.preWorkoutFatigue + answeredAt.
 */
export async function saveFatigueSignal(clientId: string, fatigued: boolean): Promise<void> {
  await patchUserStatusBio(
    clientId,
    {
      preWorkoutFatigue: fatigued,
      preWorkoutFatigueAnsweredAt: new Date().toISOString(),
    },
    "saveFatigueSignal",
  );
}

export type PerceivedDifficulty = "easy" | "just_right" | "hard";

// pump_score reuse: easy=8 (high pump = recovered), just_right=5, hard=2 (low pump = under-recovered).
// biofeedbackReactiveRules čita pump<5 → +salt/water sledeći trening.
const DIFFICULTY_TO_PUMP_SCORE: Record<PerceivedDifficulty, number> = {
  easy: 8,
  just_right: 5,
  hard: 2,
};

/**
 * Post-workout 3-button feedback (Lako/Taman/Teško).
 * 1. Upsert u daily_check_ins (audit log)
 * 2. Patch user_status.bio — latestPumpScore + consecutiveHardWorkouts
 *    (programGenerator auto-decrement volumena kad je 2+ "Teško").
 */
export async function savePostWorkoutDifficulty(
  clientId: string,
  difficulty: PerceivedDifficulty,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const pumpScore = DIFFICULTY_TO_PUMP_SCORE[difficulty];

  // 1. Snimi u daily_check_ins (audit log)
  const { error: ciErr } = await supabase
    .from("daily_check_ins")
    .upsert(
      { user_id: clientId, date: today, pump_score: pumpScore },
      { onConflict: "user_id,date" },
    );
  if (ciErr) throw new Error(`saveDifficulty check-in: ${ciErr.message}`);

  // 2. Patchuj user_status.bio — consecutiveHardWorkouts brojač
  const { data: row, error: readErr } = await supabase
    .from("user_status")
    .select("status_json")
    .eq("client_id", clientId)
    .single();
  if (readErr) throw new Error(`saveDifficulty status read: ${readErr.message}`);

  const status = (row?.status_json ?? {}) as Record<string, unknown>;
  const bio = (status.bio ?? {}) as Record<string, unknown>;
  const prevHardCount = (bio.consecutiveHardWorkouts as number | undefined) ?? 0;
  const isHard = difficulty === "hard";
  const newStatus = {
    ...status,
    bio: {
      ...bio,
      latestPumpScore: pumpScore,
      consecutiveHardWorkouts: isHard ? prevHardCount + 1 : 0,
    },
  };
  const { error: writeErr } = await supabase
    .from("user_status")
    .update({ status_json: newStatus, last_updated_at: new Date().toISOString() })
    .eq("client_id", clientId);
  if (writeErr) throw new Error(`saveDifficulty status write: ${writeErr.message}`);
}
