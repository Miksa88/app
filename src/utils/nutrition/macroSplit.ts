// ============================================================================
// macroSplit — Sloj 3 Nutrition Pipeline
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 4 (Makronutrijentni split)
//       SREDNJE_NAPREDNE_V2.md §3.3 (Intermediate macros)
// ============================================================================
//
// BEGINNER:
//   Protein = weight × 2.0
//   Fat = max(weight × 0.9, kcal × 0.25 / 9)
//   Carbs = ostatak
//
// INTERMEDIATE (SREDNJE_NAPREDNE_V2 §3.3):
//   Protein = weight × 2.2 (range 2.0-2.4, middle)
//   Fat = max(weight × 0.9, kcal × 0.25 / 9), floor weight × 0.7
//   Carbs = ostatak (target range 3.5-5.0 g/kg, derived)
//
// Posle ovog split-a, applyPathologyMacroOverride moze dalje da podesi.
// ============================================================================

import type { MacroTarget } from '@/types/nutrition';
import type { ExperienceLevel } from '@/types/training';

const PROTEIN_KCAL_PER_G = 4;
const CARBS_KCAL_PER_G = 4;
const FAT_KCAL_PER_G = 9;

const PROTEIN_G_PER_KG_BEGINNER = 2.0;
const PROTEIN_G_PER_KG_INTERMEDIATE = 2.2;     // SREDNJE_NAPREDNE_V2 §3.3
const FAT_MIN_G_PER_KG = 0.9;
const FAT_FLOOR_G_PER_KG_INTERMEDIATE = 0.7;   // SREDNJE_NAPREDNE_V2 §3.3
const FAT_MIN_FRACTION_OF_KCAL = 0.25;
const FIBER_MIN_G_PER_DAY = 25;
const FIBER_MIN_G_PER_DAY_INTERMEDIATE = 30;   // viši volumen ishrane → vlakna ↑

export interface MacroSplitInputs {
  weightKg: number;
  totalCalories: number;
  experienceLevel?: ExperienceLevel;            // default 'beginner'
}

export function calcMacroSplit(input: MacroSplitInputs): MacroTarget {
  const isIntermediate = input.experienceLevel === 'intermediate';
  const proteinPerKg = isIntermediate
    ? PROTEIN_G_PER_KG_INTERMEDIATE
    : PROTEIN_G_PER_KG_BEGINNER;

  // Protein
  const proteinG = Math.round(input.weightKg * proteinPerKg);
  const proteinKcal = proteinG * PROTEIN_KCAL_PER_G;

  // Fat — hormonalni minimum + intermediate floor
  const fatGFromBodyweight = input.weightKg * FAT_MIN_G_PER_KG;
  const fatGFromCalories =
    (input.totalCalories * FAT_MIN_FRACTION_OF_KCAL) / FAT_KCAL_PER_G;
  let fatG = Math.round(Math.max(fatGFromBodyweight, fatGFromCalories));
  if (isIntermediate) {
    const fatFloorG = Math.round(input.weightKg * FAT_FLOOR_G_PER_KG_INTERMEDIATE);
    fatG = Math.max(fatG, fatFloorG);
  }
  const fatKcal = fatG * FAT_KCAL_PER_G;

  // Carbs = ostatak
  const carbsKcal = input.totalCalories - proteinKcal - fatKcal;
  const carbsG = Math.max(0, Math.round(carbsKcal / CARBS_KCAL_PER_G));

  return {
    proteinG,
    carbsG,
    fatG,
    fiberMinG: isIntermediate
      ? FIBER_MIN_G_PER_DAY_INTERMEDIATE
      : FIBER_MIN_G_PER_DAY,
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
