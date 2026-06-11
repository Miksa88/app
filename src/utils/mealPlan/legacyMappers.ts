// ============================================================================
// mealPlan/legacyMappers — LEGACY → NEW TYPE MAPPERS
// Izvučeno iz src/utils/mealPlanGenerator.ts (refaktor split, zero behavior change)
// ============================================================================
//
// Bridge izmedju starih `metabolicProfile: string[]` i novog
// `MetabolicCondition[]` enuma. Sve sto nije prepoznato → 'none'.

import type { MetabolicCondition } from "@/types/training";
import type { CalorieTargetMode } from "@/types/nutrition";
import type { NutritionTemplate } from "./types";

export function mapToMetabolicConditions(profile: string[]): MetabolicCondition[] {
  const known: MetabolicCondition[] = ['insulin_resistance', 'hashimoto', 'pcos', 'hypertension'];
  const result = new Set<MetabolicCondition>();

  for (const raw of profile) {
    const p = raw.toLowerCase().replace(/-/g, '_');
    // 'thyroid' je legacy alias za 'hashimoto'
    if (p === 'thyroid') {
      result.add('hashimoto');
    } else if (known.includes(p as MetabolicCondition)) {
      result.add(p as MetabolicCondition);
    }
  }

  return Array.from(result);
}

export function mapGoalToTargetMode(goalType: NutritionTemplate['goalType']): CalorieTargetMode {
  switch (goalType) {
    case 'cut': return 'deficit';
    case 'bulk': return 'lean_bulk';
    case 'maintain': return 'maintenance';
    case 'health': return 'maintenance';
  }
}
