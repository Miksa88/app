// ============================================================================
// calorieTarget — IDEMPOTENTAN dnevni calorie target
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 3.3 (Kalorijski target po cilju)
//       + 03_INTEGRATION_LAYER.md Sekcija 3.3 (Idempotentnost)
// ============================================================================
//
// KRITIČNO: Ova funkcija MORA biti idempotentna. Sync Engine je poziva svaki
// put kada se neka invarijanta promeni; pokretanje 2× sa istim ulazom daje
// isti rezultat. Ne koristimo "+= delta" obrasce — uvek rekonstruisemo
// target iz baznih podataka (TDEE + targetMode + sync flags).
//
// Floor 1400 kcal je tvrda granica (Princip 2 Sekcija 1 spec-a 02): nikad
// ispod fizioloskog minimuma za prosecnu zenu, bez obzira na calorie deficit
// modifier-e.
// ============================================================================

import type { CalorieTargetMode } from '@/types/nutrition';
import type { NutritionCyclePhase } from '@/types/nutrition';
import { assertCalorieFloor } from './invariants';

export const CALORIE_FLOOR = 1400;
export const LUTEAL_CARB_BONUS_KCAL = 150;     // Spec 03 Sekcija 3.2 Rule 1
export const RETURN_FROM_BREAK_DEFICIT = 0.92; // Spec 03 Sekcija 3.2 Rule 4
export const ILLNESS_DEFICIT = 0.95;           // Spec 03 Sekcija 3.2 Rule 7

const TARGET_MODE_MULTIPLIER: Record<CalorieTargetMode, number> = {
  deficit: 0.80,        // -20% TDEE (fat_loss)
  recomposition: 0.90,  // -10% TDEE (tone)
  lean_bulk: 1.075,     // +7.5% TDEE (glute_focus)
  maintenance: 1.0,
};

// ============================================================================
// CalorieTargetInputs — sve sto utice na target u jednom objektu
// ============================================================================
//
// NAMERNO ne primamo ceo UserStatus — ova funkcija je pure data → data,
// ne sme da zna za persistencu ili dr. delove sistema. Sync Engine cita
// UserStatus i predaje ovde samo relevantna polja.

export interface CalorieTargetInputs {
  tdee: number;
  targetMode: CalorieTargetMode;

  // Sync rule flags (svaki je opcioan; default false = pravilo nije aktivno)
  isInDeload?: boolean;             // Rule 3 → maintenance
  isInReturnFromBreak?: boolean;    // Rule 4 → tdee × 0.92
  isInIllnessPause?: boolean;       // Rule 7 → tdee × 0.95
  fatigueSyncActive?: boolean;      // Rule 2 → maintenance (san+stres)

  // Cycle modifier (Rule 1)
  cyclePhase?: NutritionCyclePhase | null;
}

// ============================================================================
// recalcCalorieTarget — ono sto Sync Engine zove
// ============================================================================
//
// Redosled override-a (kasniji ima prioritet):
//   1. Goal-based base (deficit/recomposition/lean_bulk/maintenance)
//   2. Fatigue sync → maintenance (Rule 2)
//   3. Deload → maintenance (Rule 3)
//   4. Return from Break → tdee × 0.92 (Rule 4)
//   5. Illness → tdee × 0.95 (Rule 7)
//   6. Luteal bonus → +150 kcal NA VRH bilo cega (Rule 1)
//   7. Floor 1400
//
// Razlog luteal NA VRH: ona simulira biolosko povecanje BMR-a u lutealnoj
// fazi (~5–10%), pa ide kao additivan bonus, ne kao multiplikator.

export function recalcCalorieTarget(input: CalorieTargetInputs): number {
  let target = input.tdee * TARGET_MODE_MULTIPLIER[input.targetMode];

  // Rule 2 Fatigue sync (Sekcija 3.2 Rule 2 spec-a 03)
  if (input.fatigueSyncActive && input.targetMode === 'deficit') {
    target = input.tdee * TARGET_MODE_MULTIPLIER.maintenance;
  }

  // Rule 3 Deload sync (Sekcija 3.2 Rule 3) — applies samo na deficit/recomposition;
  // lean_bulk ostaje (klijentkinja na bulk-u i u deloadu treba kalorije)
  if (input.isInDeload &&
      (input.targetMode === 'deficit' || input.targetMode === 'recomposition')) {
    target = input.tdee * TARGET_MODE_MULTIPLIER.maintenance;
  }

  // Rule 4 Return from Break sync (Sekcija 3.2 Rule 4)
  if (input.isInReturnFromBreak && input.targetMode === 'deficit') {
    target = input.tdee * RETURN_FROM_BREAK_DEFICIT;
  }

  // Rule 7 Illness penalty (Sekcija 3.2 Rule 7)
  if (input.isInIllnessPause && input.targetMode === 'deficit') {
    target = input.tdee * ILLNESS_DEFICIT;
  }

  // Rule 1 Luteal phase bonus (Sekcija 3.2 Rule 1)
  if (input.cyclePhase === 'luteal') {
    target += LUTEAL_CARB_BONUS_KCAL;
  }

  // Floor — ne ide ispod fizioloskog minimuma
  const finalTarget = Math.max(Math.round(target), CALORIE_FLOOR);

  // Invariant assert (Plan Faza 2 princip: "Floor i invariante kao asserts")
  // Ovo je defenzivna mera — Math.max gore vec garantuje >= floor, ali assert
  // hvata edge case ako se kod kasnije menja i Math.max bude obrisan.
  assertCalorieFloor(finalTarget, 'recalcCalorieTarget');

  return finalTarget;
}

// ============================================================================
// resolveTargetMode — derive iz primaryGoal-a
// (koristi se u initUserStatus i u plan changes)
// ============================================================================

export function resolveTargetMode(
  primaryGoal: 'fat_loss' | 'tone' | 'glute_focus',
): CalorieTargetMode {
  switch (primaryGoal) {
    case 'fat_loss': return 'deficit';
    case 'tone': return 'recomposition';
    case 'glute_focus': return 'lean_bulk';
  }
}
