// ============================================================================
// bmrTdee — Sloj 2 Nutrition Pipeline
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 3 (Kalorijska kalibracija)
// ============================================================================
//
// BMR (Basal Metabolic Rate) preko Mifflin-St Jeor formule, zenska varijanta.
// TDEE (Total Daily Energy Expenditure) = BMR × activity multiplier.
//
// Pure funkcije — bez side effects. Klijentkinji se NIKAD ne prikazuju
// direktno (Princip 1 iz spec-a 02 — "identitet iznad kalorija").
// ============================================================================

import type { ClientTrainingProfile } from '@/types/training';

export interface BmrInputs {
  weightKg: number;
  heightCm: number;
  age: number;
}

export interface TdeeInputs {
  bmr: number;
  workoutFrequency: 3 | 4 | 5;
  jobPhysicality: 'sedentary' | 'moderate' | 'active';
}

// ============================================================================
// BMR — Mifflin-St Jeor zenska formula (Sekcija 3.1)
// ============================================================================

export function calcBMR(input: BmrInputs): number {
  // BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
  const bmr = (10 * input.weightKg) + (6.25 * input.heightCm) - (5 * input.age) - 161;
  return Math.round(bmr);
}

// ============================================================================
// Activity multiplier (Sekcija 3.2)
// ============================================================================

const ACTIVITY_BASE = {
  3: 1.375,   // Light active
  4: 1.55,    // Moderate active
  5: 1.725,   // Very active
} as const;

export function calcActivityMultiplier(
  workoutFrequency: 3 | 4 | 5,
  jobPhysicality: 'sedentary' | 'moderate' | 'active',
): number {
  let base = ACTIVITY_BASE[workoutFrequency];

  if (jobPhysicality === 'active') base += 0.05;
  if (jobPhysicality === 'sedentary') base -= 0.05;

  return base;
}

// ============================================================================
// TDEE = BMR × activity (Sekcija 3.2)
// ============================================================================

export function calcTDEE(input: TdeeInputs): number {
  const multiplier = calcActivityMultiplier(input.workoutFrequency, input.jobPhysicality);
  return Math.round(input.bmr * multiplier);
}

// ============================================================================
// Convenience helper — celo BMR+TDEE iz ClientTrainingProfile
// ============================================================================

export function calcBmrTdeeFromProfile(profile: ClientTrainingProfile): {
  bmr: number;
  tdee: number;
} {
  const bmr = calcBMR({
    weightKg: profile.weight,
    heightCm: profile.height,
    age: profile.age,
  });

  const tdee = calcTDEE({
    bmr,
    workoutFrequency: profile.trainingDays,
    jobPhysicality: profile.jobPhysicality,
  });

  return { bmr, tdee };
}
