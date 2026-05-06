import { describe, it, expect } from 'vitest';
import {
  buildIngredientExclusionList,
  filterFoodByExclusions,
  validatePoolSize,
  type FoodLike,
} from './antiIngredientFilter';

const mockFoods: FoodLike[] = [
  { ingredients: ['piletina', 'brokoli', 'heljda'], allergens: [], tags: ['low_gi', 'meal'], glycemicIndex: 'low' },
  { ingredients: ['hleb', 'siran', 'gluten'], allergens: ['gluten', 'lactose'], tags: ['high_gi'], glycemicIndex: 'high' },
  { ingredients: ['banana', 'med'], allergens: [], tags: ['snack', 'high_sugar'], glycemicIndex: 'medium' },
  { ingredients: ['losos', 'spanac'], allergens: ['fish'], tags: ['anti_inflammatory', 'omega3_rich'], glycemicIndex: 'low' },
];

describe('buildIngredientExclusionList', () => {
  it('kombinuje alergije + dislike + patoloske ekskluzije', () => {
    const ex = buildIngredientExclusionList(['gluten'], ['banana'], ['insulin_resistance']);
    expect(ex.hardExclusions).toContain('gluten');
    expect(ex.softExclusions).toContain('banana');
    expect(ex.forbiddenTags).toContain('high_gi');
    expect(ex.forbiddenTags).toContain('snack');
    expect(ex.maxAllowedGI).toBe(50);
  });

  it('PCOS strozi GI cap od IR-ovog (40 vs 50)', () => {
    const ex = buildIngredientExclusionList([], [], ['insulin_resistance', 'pcos']);
    expect(ex.maxAllowedGI).toBe(40);
  });

  it('hipertenzija dodaje high_sodium tag', () => {
    const ex = buildIngredientExclusionList([], [], ['hypertension']);
    expect(ex.forbiddenTags).toContain('high_sodium');
  });

  it('"none" se filtrira iz alergija/averzija', () => {
    const ex = buildIngredientExclusionList(['none', ''], ['none'], []);
    expect(ex.hardExclusions).toEqual([]);
    expect(ex.softExclusions).toEqual([]);
  });
});

describe('filterFoodByExclusions', () => {
  it('uklanja jelo sa alergenom', () => {
    const ex = buildIngredientExclusionList(['gluten'], [], []);
    const result = filterFoodByExclusions(mockFoods, ex);
    // hleb (allergens: gluten) → out, losos (fish) → in (gluten nije fish)
    expect(result.find(f => f.ingredients?.includes('hleb'))).toBeUndefined();
    expect(result.find(f => f.ingredients?.includes('losos'))).toBeDefined();
  });

  it('IR — uklanja high_gi i snack tagove + GI > 50', () => {
    const ex = buildIngredientExclusionList([], [], ['insulin_resistance']);
    const result = filterFoodByExclusions(mockFoods, ex);
    // hleb (high_gi tag + GI=high=70) → out
    // banana (snack tag + medium GI 50 = ok by GI cap, ali snack tag eliminira) → out
    // losos (low GI, anti_inflammatory) → in
    // piletina (low_gi) → in
    expect(result).toHaveLength(2);
    expect(result.every(f => !f.tags?.includes('snack'))).toBe(true);
    expect(result.every(f => !f.tags?.includes('high_gi'))).toBe(true);
  });

  it('soft exclusions (averzije) — uklanjaju ako applySoft=true (default)', () => {
    const ex = buildIngredientExclusionList([], ['banana'], []);
    const result = filterFoodByExclusions(mockFoods, ex);
    expect(result.find(f => f.ingredients?.includes('banana'))).toBeUndefined();
  });

  it('soft exclusions ignored ako applySoft=false (fallback mode)', () => {
    const ex = buildIngredientExclusionList([], ['banana'], []);
    const result = filterFoodByExclusions(mockFoods, ex, { applySoftExclusions: false });
    expect(result.find(f => f.ingredients?.includes('banana'))).toBeDefined();
  });

  it('GI cap radi sa numerickim i string vrednostima', () => {
    const numericFoods: FoodLike[] = [
      { ingredients: ['x'], glycemicIndex: 35 },
      { ingredients: ['y'], glycemicIndex: 60 },
    ];
    const ex = buildIngredientExclusionList([], [], ['pcos']);  // GI cap 40
    const result = filterFoodByExclusions(numericFoods, ex);
    expect(result).toHaveLength(1);
    expect(result[0].glycemicIndex).toBe(35);
  });

  it('IR + PCOS combo — najstroziji set filtera (PCOS-ov GI 40)', () => {
    const ex = buildIngredientExclusionList([], [], ['insulin_resistance', 'pcos']);
    const result = filterFoodByExclusions(mockFoods, ex);
    // Samo low GI (<= 40) i bez snack/high_sugar/high_gi tags
    expect(result.every(f => f.glycemicIndex === 'low')).toBe(true);
  });
});

describe('validatePoolSize', () => {
  it('< 40 jela — invalid', () => {
    const result = validatePoolSize(mockFoods);  // samo 4 jela
    expect(result.valid).toBe(false);
    expect(result.totalFoods).toBe(4);
  });

  it('40+ jela — valid', () => {
    const big = Array(50).fill(mockFoods[0]);
    const result = validatePoolSize(big);
    expect(result.valid).toBe(true);
  });
});
