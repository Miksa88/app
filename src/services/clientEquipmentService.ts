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
    .update({ equipment_list: cleaned as unknown as Record<string, unknown> })
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
