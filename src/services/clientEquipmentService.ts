// ============================================================================
// clientEquipmentService — trener-managed equipment list per klijent
// V3 §10 — "Equipment tab per client (knows what client has at home/gym)"
// ============================================================================
//
// Persists na profiles.equipment_list JSONB. Trener pise; klijent cita svoj red.
// Filter za ExercisePicker: vezbe ciji je ceo equipment array subset
// klijent's equipment_list-a su "available", ostale su "potrebno X".
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// Kanonska lista equipment opcija (matche ExerciseItem.equipment u
// trainerMockData.ts EXERCISE_LIBRARY).
export const EQUIPMENT_OPTIONS = [
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Cable Machine",
  "Machine",
  "Bench",
  "Rack",
  "Bodyweight",
] as const;

export type EquipmentOption = (typeof EQUIPMENT_OPTIONS)[number];

export async function getClientEquipment(clientId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("equipment_list")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    // Graceful fallback ako migracija jos nije pushed na remote.
    if (error.message.includes("column") && error.message.includes("does not exist")) {
      return [];
    }
    throw new Error(`getClientEquipment(${clientId}) failed: ${error.message}`);
  }
  const raw = (data?.equipment_list as string[] | null) ?? [];
  return Array.isArray(raw) ? raw : [];
}

export async function setClientEquipment(
  clientId: string,
  equipment: string[],
): Promise<void> {
  const cleaned = Array.from(new Set(equipment.filter(Boolean)));
  const { error } = await supabase
    .from("profiles")
    .update({ equipment_list: cleaned as Json })
    .eq("id", clientId);

  if (error) {
    throw new Error(`setClientEquipment(${clientId}) failed: ${error.message}`);
  }
}

/**
 * Vraca true ako klijent ima svu opremu koja je vezbi potrebna.
 * Bodyweight se uvek smatra dostupnim (ne zahteva nista).
 */
export function hasRequiredEquipment(
  required: string[] | null | undefined,
  clientEquipment: string[],
): boolean {
  if (!required || required.length === 0) return true;
  const owned = new Set(clientEquipment);
  return required.every((e) => e === "Bodyweight" || owned.has(e));
}

// ----------------------------------------------------------------------------
// Normalizacija: EQUIPMENT_OPTIONS (Title Case, profiles.equipment_list)
// → training Equipment tokeni (lowercase, types/training.ts `Equipment`).
// "Cable Machine" → 'cable'; ostalo je 1:1 lowercase.
// ----------------------------------------------------------------------------

const OPTION_TO_TRAINING_TOKEN: Record<string, string> = {
  "barbell": "barbell",
  "dumbbell": "dumbbell",
  "kettlebell": "kettlebell",
  "cable machine": "cable",
  "machine": "machine",
  "bench": "bench",
  "rack": "rack",
  "bodyweight": "bodyweight",
};

/** Klijentova lista (Title Case opcije) → set lowercase training tokena. */
export function toTrainingEquipmentTokens(
  clientEquipment: readonly string[],
): Set<string> {
  const tokens = new Set<string>();
  for (const item of clientEquipment) {
    const key = item.toLowerCase();
    tokens.add(OPTION_TO_TRAINING_TOKEN[key] ?? key);
  }
  return tokens;
}

/**
 * Da li klijentkinja ima opremu za vežbu (Exercise.equipment lowercase tokeni).
 * Bodyweight uvek prolazi; vežba bez ikakvog equipment zahteva uvek prolazi.
 * Tokeni bez klijent-opcije (npr. 'band', 'smith') prolaze samo ako su
 * eksplicitno u listi klijenta.
 */
export function hasTrainingEquipment(
  required: readonly string[] | null | undefined,
  clientEquipment: readonly string[],
): boolean {
  if (!required || required.length === 0) return true;
  const owned = toTrainingEquipmentTokens(clientEquipment);
  return required.every(
    (e) => e.toLowerCase() === "bodyweight" || owned.has(e.toLowerCase()),
  );
}

/**
 * Filtrira vežbe po opremi koju klijentkinja ima.
 * Ako klijent NEMA equipment profil (prazna lista) → bez filtera, vraćamo
 * sve (nikad prazan spisak zbog nepopunjenog profila).
 */
export function filterExercisesByEquipment<T extends { equipment: readonly string[] }>(
  exercises: T[],
  clientEquipment: readonly string[],
): T[] {
  if (clientEquipment.length === 0) return exercises;
  return exercises.filter((ex) => hasTrainingEquipment(ex.equipment, clientEquipment));
}
