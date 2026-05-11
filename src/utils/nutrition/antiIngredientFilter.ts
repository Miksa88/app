// ============================================================================
// antiIngredientFilter — Anti-Ingredient Filter (Sloj 1 nutrition)
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 2.3
// ============================================================================
//
// Kombinuje:
//   - alergije (medicinski imperativ — NIKAD u plan)
//   - averzije / dislikedFoods (preference — fallback ako nema alternative)
//   - patoloske ekskluzije (auto na osnovu metabolicProfile-a)
//
// Pure funkcija — uzima FoodItem[] i exclusion list, vraca filtriran pool.
// Ne koristi food database direktno; prima ga kao argument (testabilnost).
// ============================================================================

import type { MetabolicCondition } from '@/types/training';

// ============================================================================
// Generic FoodLike — bilo koja struktura koja ima ingredientsList + tags
// ============================================================================
//
// Apstrakcija da filter moze da radi sa nasim novim FoodItem tipom (nutrition.ts)
// ali i sa legacy FoodItem iz data/foodDatabase.ts.

export interface FoodLike {
  ingredientsList?: string[];      // novi tip
  ingredients?: string[];           // legacy alias
  allergensList?: string[];         // novi tip
  allergens?: string[];             // legacy alias
  tags?: string[];
  glycemicIndex?: number | 'low' | 'medium' | 'high';
}

export interface IngredientExclusionList {
  hardExclusions: string[];        // alergije + patoloske — NIKAD u plan
  softExclusions: string[];        // averzije — fallback OK
  forbiddenTags: string[];         // tag-level exclusions (npr. high_gi za IR)
  maxAllowedGI?: number;           // numericki cap
}

// ============================================================================
// buildIngredientExclusionList — kombinuje sve izvore u jednu listu
// ============================================================================

export function buildIngredientExclusionList(
  allergies: string[],
  dislikedFoods: string[],
  metabolicConditions: MetabolicCondition[],
): IngredientExclusionList {
  return {
    hardExclusions: [
      ...normalizeList(allergies),
      ...getPathologyHardExclusions(metabolicConditions),
    ],
    softExclusions: normalizeList(dislikedFoods),
    forbiddenTags: getPathologyForbiddenTags(metabolicConditions),
    maxAllowedGI: getMaxAllowedGI(metabolicConditions),
  };
}

// ============================================================================
// Patoloske ekskluzije — Sekcija 5.1 Patoloska matrica
// ============================================================================

function getPathologyHardExclusions(conditions: MetabolicCondition[]): string[] {
  const result: string[] = [];

  if (conditions.includes('hashimoto')) {
    // Hashimoto: gluten samo ako je oznaceno u alergijama (nije auto)
    // Ali inflammatory namirnice se iskljucuju kroz tag filter
  }

  return result;
}

function getPathologyForbiddenTags(conditions: MetabolicCondition[]): string[] {
  const tags: string[] = [];

  if (conditions.includes('insulin_resistance')) {
    tags.push('high_gi', 'snack', 'high_sugar');
  }
  if (conditions.includes('hashimoto')) {
    tags.push('inflammatory', 'processed');
  }
  if (conditions.includes('pcos')) {
    tags.push('high_gi', 'high_saturated_fat');
  }
  if (conditions.includes('hypertension')) {
    tags.push('high_sodium');
  }

  return Array.from(new Set(tags));
}

function getMaxAllowedGI(conditions: MetabolicCondition[]): number | undefined {
  // PCOS je strozi (40) nego IR (50) — uzimamo manji ako oba postoje
  if (conditions.includes('pcos')) return 40;
  if (conditions.includes('insulin_resistance')) return 50;
  return undefined;
}

// ============================================================================
// filterFoodByExclusions — primjenjuje filter na pool jela
// ============================================================================
//
// Strategija:
//   1. Hard exclusions (alergije + patoloske) — apsolutno
//   2. Forbidden tags — exclude
//   3. GI cap — exclude
//   4. Soft exclusions (averzije) — opciono, samo ako relax === false

export function filterFoodByExclusions<T extends FoodLike>(
  foods: T[],
  exclusions: IngredientExclusionList,
  options: { applySoftExclusions?: boolean } = {},
): T[] {
  const applySoft = options.applySoftExclusions ?? true;

  return foods.filter(food => {
    const ingredients = (food.ingredientsList ?? food.ingredients ?? []).map(s => s.toLowerCase());
    const allergens = (food.allergensList ?? food.allergens ?? []).map(s => s.toLowerCase());
    const tags = (food.tags ?? []).map(s => s.toLowerCase());

    // 1. Hard exclusions — alergije se proveravaju protiv allergensList,
    //    patoloske ekskluzije protiv ingredientsList
    for (const ex of exclusions.hardExclusions.map(s => s.toLowerCase())) {
      if (allergens.includes(ex)) return false;
      if (ingredients.includes(ex)) return false;
    }

    // 2. Forbidden tags
    for (const tag of exclusions.forbiddenTags.map(s => s.toLowerCase())) {
      if (tags.includes(tag)) return false;
    }

    // 3. GI cap
    if (exclusions.maxAllowedGI !== undefined && food.glycemicIndex !== undefined) {
      const giValue = normalizeGI(food.glycemicIndex);
      if (giValue !== null && giValue > exclusions.maxAllowedGI) return false;
    }

    // 4. Soft exclusions — pokusaj da izbegnes ako moguce
    if (applySoft) {
      for (const ex of exclusions.softExclusions.map(s => s.toLowerCase())) {
        if (ingredients.some(i => i.includes(ex))) return false;
      }
    }

    return true;
  });
}

// ============================================================================
// validatePoolSize — provera da li je pool dovoljno bogat posle filtera
// Spec: 02 Sekcija 11.4
// ============================================================================

const MIN_FOODS_PER_CATEGORY = 8;

export interface PoolValidationResult {
  valid: boolean;
  issue?: string;
  totalFoods: number;
  perCategory?: Record<string, number>;
}

export function validatePoolSize<T extends FoodLike & { category?: string; mealSlots?: string[] }>(
  pool: T[],
): PoolValidationResult {
  if (pool.length < MIN_FOODS_PER_CATEGORY * 5) {
    return {
      valid: false,
      issue: `Pool je premali (${pool.length} jela ukupno). Trener mora da relaksira filtere ili doda jela.`,
      totalFoods: pool.length,
    };
  }
  return { valid: true, totalFoods: pool.length };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeList(items: string[] | undefined): string[] {
  return (items ?? [])
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0 && s !== 'none');
}

function normalizeGI(gi: number | 'low' | 'medium' | 'high'): number | null {
  if (typeof gi === 'number') return gi;
  if (gi === 'low') return 35;
  if (gi === 'medium') return 50;
  if (gi === 'high') return 70;
  return null;
}
