// ============================================================================
// pathologyMacroOverride — Patoloska matrica
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 4.5 + Sekcija 5 (Patoloska matrica)
// ============================================================================
//
// Posle baznog macro split-a (macroSplit.ts), patologije name override-uju
// rezultat. Pure funkcija — uzima MacroTarget i lista MetabolicCondition,
// vraca novi MacroTarget. Idempotentno: pokretanje 2x sa istim ulazom daje
// isti izlaz (jer build-uje target iz baseline-a, ne akumulira).
//
// Kombinacije patologija (Sekcija 5.2):
//   IR + PCOS  → najstroziji filter (max GI 40, snacking off)
//   Hashimoto + Hipertenzija  → kumulira filtere bez konflikta
//   IR + Hashimoto  → low-GI + anti-inflammatory + bez procesirano
// ============================================================================

import type { MacroTarget } from '@/types/nutrition';
import type { MetabolicCondition } from '@/types/training';

export interface PathologyOverrideInputs {
  macros: MacroTarget;
  totalCalories: number;
  conditions: MetabolicCondition[];
}

export function applyPathologyMacroOverride(
  input: PathologyOverrideInputs,
): MacroTarget {
  // Plitka kopija da ne mutiramo ulaz
  const out: MacroTarget = { ...input.macros };
  const conditions = input.conditions;

  // === Insulin resistance ===
  // Carbs max 23% kcal (Sekcija 4.5). Ako baseline imao vise — preusmeri
  // razliku u masti (insulinski neutralne).
  if (conditions.includes('insulin_resistance')) {
    const maxCarbKcal = input.totalCalories * 0.23;
    const maxCarbG = Math.round(maxCarbKcal / 4);
    if (out.carbsG > maxCarbG) {
      const diffG = out.carbsG - maxCarbG;
      out.carbsG = maxCarbG;
      // Razlika kcal preusmerena u masti: kcal = diffG × 4, masti = kcal / 9
      out.fatG += Math.round((diffG * 4) / 9);
    }
  }

  // === PCOS ===
  // Omega-3 min 2g/dan + maxAllowedGI = 40 (strozi nego IR-ovih 50)
  if (conditions.includes('pcos')) {
    out.omega3MinG = Math.max(out.omega3MinG ?? 0, 2);
    out.maxAllowedGI = Math.min(out.maxAllowedGI ?? 100, 40);
  }

  // === IR + PCOS combo (Sekcija 5.2) ===
  // PCOS-ov maxAllowedGI = 40 vec preglasi IR-ov "GI < 50".
  // Snacking off je tag-level filter, ne macro override → resava se u
  // antiIngredientFilter.ts. Ovde nema dodatne macro promene.

  // === Hashimoto ===
  // Nema math override-a, samo tag filter (anti-inflammatory).
  if (conditions.includes('hashimoto')) {
    out.antiInflammatoryFlag = true;
  }

  // === Hypertension ===
  if (conditions.includes('hypertension')) {
    out.sodiumMaxMg = Math.min(out.sodiumMaxMg ?? Infinity, 2000);
    out.potassiumMinMg = Math.max(out.potassiumMinMg ?? 0, 3500);
  }

  return out;
}
