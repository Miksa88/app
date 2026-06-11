// ============================================================================
// trialSettingsService — trener trial config (P0-3)
// ============================================================================
//
// Persists na profiles.trial_settings JSONB. Vidi ga samo trener (RLS na
// profiles dozvoljava SELECT/UPDATE svojih).
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface TrialSettings {
  duration: number;
  includes: {
    workouts: boolean;
    nutrition: boolean;
    chat: boolean;
    progress: boolean;
  };
  programId: string | null;
  mealPlanId: string | null;
}

export const DEFAULT_TRIAL_SETTINGS: TrialSettings = {
  duration: 7,
  includes: { workouts: true, nutrition: true, chat: false, progress: true },
  programId: null,
  mealPlanId: null,
};

export async function getTrialSettings(trainerId: string): Promise<TrialSettings> {
  const { data, error } = await supabase
    .from("profiles")
    .select("trial_settings")
    .eq("id", trainerId)
    .maybeSingle();
  if (error) throw new Error(`getTrialSettings: ${error.message}`);
  const raw = (data?.trial_settings as TrialSettings | null) ?? null;
  if (!raw) return DEFAULT_TRIAL_SETTINGS;
  return {
    duration: raw.duration ?? DEFAULT_TRIAL_SETTINGS.duration,
    includes: { ...DEFAULT_TRIAL_SETTINGS.includes, ...raw.includes },
    programId: raw.programId ?? null,
    mealPlanId: raw.mealPlanId ?? null,
  };
}

export async function setTrialSettings(
  trainerId: string,
  settings: TrialSettings,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ trial_settings: settings as unknown as Json })
    .eq("id", trainerId);
  if (error) throw new Error(`setTrialSettings: ${error.message}`);
}
