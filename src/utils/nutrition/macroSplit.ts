// ============================================================================
// macroSplit — Sloj 3 Nutrition Pipeline
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 4 (Makronutrijentni split)
// ============================================================================
//
// Konstantna pravila:
//   Protein = weight_kg × 2.0 (fiksno za sve ciljeve)
//   Fat = max(weight_kg × 0.9, totalCalories × 0.25 / 9)
//   Carbs = (totalCalories - protein_kcal - fat_kcal) / 4
//
// Posle ovog split-a, applyPathologyMacroOverride moze dalje da podesi
// (npr. IR snizi carbs na max 23% pa razliku prebaci u masti). Ovo je
// baseline pre patoloskog filtera.
// ============================================================================

import type { MacroTarget } from '@/types/nutrition';

const PROTEIN_KCAL_PER_G = 4;
const CARBS_KCAL_PER_G = 4;
const FAT_KCAL_PER_G = 9;

const PROTEIN_G_PER_KG = 2.0;
const FAT_MIN_G_PER_KG = 0.9;
const FAT_MIN_FRACTION_OF_KCAL = 0.25;
const FIBER_MIN_G_PER_DAY = 25;     // Sekcija 6.1 Zakon 4

export interface MacroSplitInputs {
  weightKg: number;
  totalCalories: number;
}

export function calcMacroSplit(input: MacroSplitInputs): MacroTarget {
  // Sekcija 4.1 — Protein konstanta
  const proteinG = Math.round(input.weightKg * PROTEIN_G_PER_KG);
  const proteinKcal = proteinG * PROTEIN_KCAL_PER_G;

  // Sekcija 4.2 — Fat hormonalni minimum
  const fatGFromBodyweight = input.weightKg * FAT_MIN_G_PER_KG;
  const fatGFromCalories =
    (input.totalCalories * FAT_MIN_FRACTION_OF_KCAL) / FAT_KCAL_PER_G;
  const fatG = Math.round(Math.max(fatGFromBodyweight, fatGFromCalories));
  const fatKcal = fatG * FAT_KCAL_PER_G;

  // Sekcija 4.3 — Carbs su ostatak
  const carbsKcal = input.totalCalories - proteinKcal - fatKcal;
  const carbsG = Math.max(0, Math.round(carbsKcal / CARBS_KCAL_PER_G));

  return {
    proteinG,
    carbsG,
    fatG,
    fiberMinG: FIBER_MIN_G_PER_DAY,
  };
}

// ============================================================================
// Helper za kvik check da li su makro brojevi u skladu sa ciljem
// (rounding ostavlja 0–2 kcal devijaciju, sto je prihvatljivo)
// ============================================================================

export function macroTotalCalories(macros: MacroTarget): number {
  return (
    macros.proteinG * PROTEIN_KCAL_PER_G +
    macros.carbsG * CARBS_KCAL_PER_G +
    macros.fatG * FAT_KCAL_PER_G
  );
}
