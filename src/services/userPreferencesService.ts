// ============================================================================
// userPreferencesService — per-user notif prefs + units
// V3 §6 + §14
// ============================================================================
//
// Persists na profiles.notification_preferences i profiles.preferred_units JSONB.
// Self-managed: korisnik cita/pise svoj red.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

// ── Notification preferences ──

export type NotificationCategoryKey =
  | "workout"
  | "meals"
  | "chat"
  | "system"
  | "achievement";

export interface VacationState {
  active: boolean;
  until: string | null; // YYYY-MM-DD
  message: string | null;
}

export interface NotificationPreferences {
  quiet_hours: {
    start: string; // "HH:MM"
    end: string;
  };
  categories: Record<NotificationCategoryKey, boolean>;
  vacation?: VacationState; // Trener-only — V3 §12 auto-reply.
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  quiet_hours: { start: "22:00", end: "07:00" },
  categories: {
    workout: true,
    meals: true,
    chat: true,
    system: false,
    achievement: false,
  },
};

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("column") && error.message.includes("does not exist")) {
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
    throw new Error(
      `getNotificationPreferences(${userId}) failed: ${error.message}`,
    );
  }
  const raw = data?.notification_preferences as Partial<NotificationPreferences> | null;
  if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
  return {
    quiet_hours: {
      start: raw.quiet_hours?.start ?? DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours.start,
      end: raw.quiet_hours?.end ?? DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours.end,
    },
    categories: {
      ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
      ...(raw.categories ?? {}),
    },
    vacation: raw.vacation,
  };
}

/**
 * Provera da li je vacation aktivan za trenera. Vraca null ako nije.
 * Auto-clears expired vacation (until < danas).
 */
export function getActiveVacation(
  prefs: NotificationPreferences | null | undefined,
): VacationState | null {
  const v = prefs?.vacation;
  if (!v || !v.active) return null;
  if (v.until) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (new Date(v.until) < now) return null;
  }
  return v;
}

export async function setNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      notification_preferences: prefs as unknown as Record<string, unknown>,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(
      `setNotificationPreferences(${userId}) failed: ${error.message}`,
    );
  }
}

// ── Preferred units ──

export type WeightUnit = "kg" | "lb";
export type LengthUnit = "cm" | "in";

export interface PreferredUnits {
  weight: WeightUnit;
  length: LengthUnit;
}

export const DEFAULT_UNITS: PreferredUnits = { weight: "kg", length: "cm" };

export async function getPreferredUnits(userId: string): Promise<PreferredUnits> {
  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_units")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("column") && error.message.includes("does not exist")) {
      return DEFAULT_UNITS;
    }
    throw new Error(`getPreferredUnits(${userId}) failed: ${error.message}`);
  }
  const raw = data?.preferred_units as Partial<PreferredUnits> | null;
  if (!raw) return DEFAULT_UNITS;
  return {
    weight: raw.weight === "lb" ? "lb" : "kg",
    length: raw.length === "in" ? "in" : "cm",
  };
}

export async function setPreferredUnits(
  userId: string,
  units: PreferredUnits,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_units: units as unknown as Record<string, unknown>,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`setPreferredUnits(${userId}) failed: ${error.message}`);
  }
}

// ── Conversion helpers ──

export const KG_TO_LB = 2.2046226218;
export const CM_TO_IN = 0.3937007874;

export function kgToLb(kg: number): number {
  return Math.round(kg * KG_TO_LB * 10) / 10;
}
export function lbToKg(lb: number): number {
  return Math.round((lb / KG_TO_LB) * 10) / 10;
}
export function cmToIn(cm: number): number {
  return Math.round(cm * CM_TO_IN * 10) / 10;
}
export function inToCm(inch: number): number {
  return Math.round((inch / CM_TO_IN) * 10) / 10;
}

export function displayWeight(kg: number, unit: WeightUnit): string {
  if (unit === "lb") return `${kgToLb(kg).toFixed(1)} lb`;
  return `${kg.toFixed(1)} kg`;
}

export function displayLength(cm: number, unit: LengthUnit): string {
  if (unit === "in") return `${cmToIn(cm).toFixed(1)} in`;
  return `${cm.toFixed(1)} cm`;
}
