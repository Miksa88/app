import { FoodItem } from "@/data/foodDatabase";
import { calcBMR, calcTDEE } from "@/utils/nutrition/bmrTdee";
import { recalcCalorieTarget, CALORIE_FLOOR } from "@/utils/nutrition/calorieTarget";
import { calcMacroSplit } from "@/utils/nutrition/macroSplit";
import { applyPathologyMacroOverride } from "@/utils/nutrition/pathologyMacroOverride";
import { buildIngredientExclusionList, filterFoodByExclusions } from "@/utils/nutrition/antiIngredientFilter";
import {
  pickMealCalorieDistribution,
  type MealCalorieDistribution,
} from "@/utils/nutrition/irMealStructure";
import type { MetabolicCondition } from "@/types/training";
import type { CalorieTargetMode, NutritionCyclePhase } from "@/types/nutrition";
import {
  CARBS_KCAL_PER_G,
  FAT_KCAL_PER_G,
  MIN_WORKOUT_FREQUENCY,
  MAX_WORKOUT_FREQUENCY,
  DEFAULT_WORKOUT_FREQUENCY,
  HIGH_STRESS_THRESHOLD,
  LOW_SLEEP_QUALITY_THRESHOLD,
  DEFAULT_TRAINING_DAY_CALORIE_BONUS,
  DEFAULT_REST_DAY_CALORIE_REDUCTION,
  PROTEIN_FLOOR_PER_MEAL_G,
  PROTEIN_RANGE_PER_SLOT_G,
  PROTEIN_SHORTFALL_PENALTY,
  CALORIE_DIFF_WEIGHT,
  PROTEIN_DIFF_WEIGHT,
  MEAL_ROTATION_VARIANTS,
  DAYS_PER_WEEK,
  TOP_MATCHES_FOR_ROTATION,
  IR_MINI_MEAL_MIN_SLOT_COUNT,
  SIMILAR_MEAL_TOLERANCE,
  SIMILAR_MEAL_TOP_N,
  TEMPLATE_SCORE_GOAL_MATCH,
  TEMPLATE_SCORE_EXPERIENCE_MATCH,
  TEMPLATE_SCORE_FREQUENCY_MATCH,
  TEMPLATE_SCORE_LIMITATION_SAFE,
  TEMPLATE_SCORE_FREE_TRIAL,
} from "@/constants/nutritionConstants";

// ── INTERFACES ──

export interface ClientProfile {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  goal: string;
  experience: string;
  frequency: number;
  allergies: string[];
  foodDislikes: string[];
  metabolicProfile: string[];
  sleepQuality: number;
  stressLevel: number;
  jobType: string;
  bodyFatEstimate?: 'low' | 'moderate' | 'high' | 'very_high';
}

export interface NutritionTemplate {
  id: string;
  name: string;
  description: string;
  goalType: 'cut' | 'bulk' | 'maintain' | 'health';
  macroRatio: { protein: number; carbs: number; fat: number };
  macroPreset: string;
  calorieStrategy: 'auto' | 'fixed' | 'range';
  fixedCalories?: number;
  calorieRange?: { min: number; max: number };
  trainingDayModifier?: number;
  restDayModifier?: number;
  differentOnTrainingDays: boolean;
  restrictions: string[];
  tags: string[];
  createdAt: string;
  mealCount: number;
  mealSlots: TemplateMealSlot[];
}

export interface TemplateMealSlot {
  id: string;
  order: number;
  type: 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack' | 'pre_workout' | 'post_workout';
  label: string;
  caloriePercentage: number;
  minProteinGrams: number;
}

export interface PlanInsight {
  type: 'info' | 'warning' | 'adjustment';
  icon: string;
  title: string;
  description: string;
}

export interface GeneratedMealPlan {
  dailyCalories: number;
  trainingDayCalories: number;
  restDayCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  meals: GeneratedMeal[];
  insights: PlanInsight[];
  metabolicAdjustments: string[];
}

export interface GeneratedMeal {
  slot: string;
  slotLabel: string;
  mealId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  portionMultiplier: number;
  glycemicIndex: 'low' | 'medium' | 'high';
  isPostWorkout: boolean;
  synergyNotes: string[];
  // IR-specifican marker (IT-19): true ako slot postaje mini-obrok P+F
  // za klijentkinju sa insulin_resistance. Optional zbog backward compat.
  slotType?: 'standard' | 'mini_meal_ir';
}

interface MealSlotConfig {
  slot: string;
  label: string;
  calPct: number;
  minProtein: number;
  maxProtein: number;
  isMainMeal: boolean;
  // Original template slot tip (npr. 'morning_snack') — koristi se za
  // IR distribution lookup u pickMealCalorieDistribution + za
  // oznacavanje slotova 2/4 kao mini_meal_ir.
  templateType: TemplateMealSlot['type'];
}

// ── LEGACY → NEW TYPE MAPPERS ──
// Bridge izmedju starih `metabolicProfile: string[]` i novog
// `MetabolicCondition[]` enuma. Sve sto nije prepoznato → 'none'.

function mapToMetabolicConditions(profile: string[]): MetabolicCondition[] {
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

function mapGoalToTargetMode(goalType: NutritionTemplate['goalType']): CalorieTargetMode {
  switch (goalType) {
    case 'cut': return 'deficit';
    case 'bulk': return 'lean_bulk';
    case 'maintain': return 'maintenance';
    case 'health': return 'maintenance';
  }
}

// ── SYNERGY DETECTION ──

function detectSynergies(food: FoodItem): string[] {
  const notes: string[] = [];
  const ingredients = food.ingredients?.map(i => i.toLowerCase()) || [];
  const tags = food.tags || [];

  const hasVitC = ingredients.some(i =>
    i.includes('paprika') || i.includes('pepper') || i.includes('limun') || i.includes('lemon') ||
    i.includes('paradajz') || i.includes('tomato') || i.includes('brokoli') || i.includes('broccoli') ||
    i.includes('narandža') || i.includes('berries')
  );
  const hasIron = ingredients.some(i =>
    i.includes('spanać') || i.includes('spinach') || i.includes('govedina') || i.includes('beef') ||
    i.includes('sočivo') || i.includes('ćuretina') || i.includes('turkey')
  );
  if (hasVitC && hasIron) {
    notes.push('insight.synergyVitCIron');
  }

  const hasFat = ingredients.some(i =>
    i.includes('olive oil') || i.includes('maslinovo') || i.includes('avocado') || i.includes('avokado') ||
    i.includes('nuts') || i.includes('orasi') || i.includes('salmon') || i.includes('losos') ||
    i.includes('almonds') || i.includes('bademi')
  );
  const hasFatSolubleVits = ingredients.some(i =>
    i.includes('šargarepa') || i.includes('carrot') || i.includes('spanać') || i.includes('spinach') ||
    i.includes('brokoli') || i.includes('broccoli') || i.includes('egg') || i.includes('jaj')
  );
  if (hasFat && hasFatSolubleVits) {
    notes.push('insight.synergyFatVitamins');
  }

  if (tags.includes('omega-3')) {
    notes.push('insight.synergyOmega3');
  }

  return notes;
}

// ── MEAL MATCHING ──

function findTopMatches(
  foods: FoodItem[],
  targetCal: number,
  targetProtein: number,
  minProtein: number,
  topN: number = 3,
): FoodItem[] {
  if (foods.length === 0) return [];

  return foods
    .map(food => {
      const portionMultiplier = food.calories > 0 ? targetCal / food.calories : 1;
      const adjustedProtein = food.protein * portionMultiplier;
      const proteinPenalty = adjustedProtein < minProtein ? PROTEIN_SHORTFALL_PENALTY : 0;
      const calDiff = Math.abs(food.calories - targetCal);
      const proteinDiff = Math.abs(food.protein - targetProtein);
      const score = (calDiff * CALORIE_DIFF_WEIGHT) + (proteinDiff * PROTEIN_DIFF_WEIGHT) + proteinPenalty;
      return { food, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, topN)
    .map(x => x.food);
}

function findBestMatch(
  foods: FoodItem[],
  targetCal: number,
  targetProtein: number,
  minProtein: number,
): FoodItem | null {
  return findTopMatches(foods, targetCal, targetProtein, minProtein, 1)[0] ?? null;
}

function createMealFromFood(
  food: FoodItem,
  slotConfig: MealSlotConfig,
  targetCal: number,
  isPostWorkout: boolean
): GeneratedMeal {
  const portionMultiplier = Math.round((food.calories > 0 ? targetCal / food.calories : 1) * 100) / 100;
  return {
    slot: slotConfig.slot as GeneratedMeal['slot'],
    slotLabel: slotConfig.label,
    mealId: food.id,
    name: food.name,
    calories: targetCal,
    protein: Math.round(food.protein * portionMultiplier),
    carbs: Math.round(food.carbs * portionMultiplier),
    fat: Math.round(food.fat * portionMultiplier),
    fiber: Math.round((food.fiber || 0) * portionMultiplier),
    portionMultiplier,
    glycemicIndex: food.glycemicIndex || 'medium',
    isPostWorkout,
    synergyNotes: [],
  };
}

// ── MAIN ALGORITHM ──

export function generateMealPlan(
  client: ClientProfile,
  template: NutritionTemplate,
  foodDatabase: FoodItem[],
  _trainingSchedule?: { trainingDays: number[] },
  cyclePhase?: NutritionCyclePhase | null,
  /**
   * A/B/C dnevna rotacija (0=Pon, 1=Uto, 2=Sre, 0=Čet, ...). Iste makroe,
   * različita jela. Ako se ne prosledi, koristi se 0 (klasičan single-day plan).
   */
  rotationIndex?: number,
): GeneratedMealPlan {

  const insights: PlanInsight[] = [];
  const metabolicAdjustments: string[] = [];

  // === REFAKTOR (Faza 2.4): koristimo nove pure formule iz nutrition/ ===
  // Spec referenca: 02_NUTRITION_FLOW_MASTER.md Sekcije 3, 4, 5

  // STEP 1+2: BMR + TDEE (Mifflin-St Jeor zenska + activity multiplier)
  // (Sloj 2 spec-a 02 — bmrTdee.ts)
  const bmr = calcBMR({ weightKg: client.weight, heightCm: client.height, age: client.age });
  const workoutFreq = (client.frequency >= MIN_WORKOUT_FREQUENCY && client.frequency <= MAX_WORKOUT_FREQUENCY
    ? client.frequency
    : DEFAULT_WORKOUT_FREQUENCY) as 3 | 4 | 5;
  const jobPhys = client.jobType === 'sedentary' ? 'sedentary'
    : client.jobType === 'active' ? 'active'
    : 'moderate';
  const tdee = calcTDEE({ bmr, workoutFrequency: workoutFreq, jobPhysicality: jobPhys });

  // STEP 3: Mapiraj legacy metabolicProfile → MetabolicCondition[] enum
  const metabolicConditions = mapToMetabolicConditions(client.metabolicProfile);

  // Insights za UI (zadrzano radi backward compat sa PlanInsightCard.tsx)
  if (metabolicConditions.includes('insulin_resistance')) {
    metabolicAdjustments.push('insulin_resistance');
    insights.push({ type: 'adjustment', icon: '🔬', title: 'insight.insulinTitle', description: 'insight.insulinDesc' });
  }
  if (metabolicConditions.includes('pcos')) {
    metabolicAdjustments.push('pcos');
    insights.push({ type: 'adjustment', icon: '🔬', title: 'insight.pcosTitle', description: 'insight.pcosDesc' });
  }
  if (metabolicConditions.includes('hashimoto')) {
    metabolicAdjustments.push('thyroid');
    insights.push({ type: 'warning', icon: '⚠️', title: 'insight.thyroidTitle', description: 'insight.thyroidDesc' });
  }
  if (client.experience === 'beginner' && template.goalType === 'cut') {
    metabolicAdjustments.push('beginner_protection');
    insights.push({ type: 'info', icon: '🛡️', title: 'insight.beginnerTitle', description: 'insight.beginnerDesc' });
  }
  if (client.stressLevel >= HIGH_STRESS_THRESHOLD || client.sleepQuality <= LOW_SLEEP_QUALITY_THRESHOLD) {
    metabolicAdjustments.push('stress_sleep_adjustment');
    insights.push({ type: 'adjustment', icon: '😴', title: 'insight.stressTitle', description: 'insight.stressDesc' });
  }

  // STEP 4: Calorie target sa idempotentnim recalc-om
  // (Spec 03 Sekcija 3.3 — recalcCalorieTarget je SSO za sve sync override-e)
  const targetMode = mapGoalToTargetMode(template.goalType);
  let dailyCalories: number;

  if (template.calorieStrategy === 'fixed') {
    dailyCalories = Math.max(template.fixedCalories || tdee, CALORIE_FLOOR);
  } else if (template.calorieStrategy === 'range') {
    const mid = ((template.calorieRange?.min || tdee) + (template.calorieRange?.max || tdee)) / 2;
    dailyCalories = Math.max(Math.round(mid), CALORIE_FLOOR);
  } else {
    // 'auto' → idempotentni recalc
    dailyCalories = recalcCalorieTarget({
      tdee,
      targetMode,
      cyclePhase: cyclePhase ?? undefined,
      // Stress + nizak san aktivira fatigue safeguard (Spec 03 Rule 2)
      fatigueSyncActive: client.stressLevel >= HIGH_STRESS_THRESHOLD || client.sleepQuality <= LOW_SLEEP_QUALITY_THRESHOLD,
      // pocetnici.md §1.1: Hashimoto deficit cap
      metabolicConditions,
    });
  }

  const trainingDayCalories = dailyCalories + (template.differentOnTrainingDays ? (template.trainingDayModifier || DEFAULT_TRAINING_DAY_CALORIE_BONUS) : 0);
  const restDayCalories = dailyCalories + (template.differentOnTrainingDays ? (template.restDayModifier || DEFAULT_REST_DAY_CALORIE_REDUCTION) : 0);

  // STEP 5: Makro split + patoloski override
  // (Spec 02 §4 + SREDNJE_NAPREDNE_V2 §3.3 za intermediate macros)
  const baseMacros = calcMacroSplit({
    weightKg: client.weight,
    totalCalories: dailyCalories,
    experienceLevel: client.experience === 'intermediate' ? 'intermediate' : 'beginner',
  });
  const finalMacros = applyPathologyMacroOverride({
    macros: baseMacros,
    totalCalories: dailyCalories,
    conditions: metabolicConditions,
  });
  const proteinGrams = finalMacros.proteinG;
  const carbsGrams = finalMacros.carbsG;
  const fatGrams = finalMacros.fatG;

  // STEP 6: Anti-Ingredient Filter (Spec 02 Sekcija 2.3)
  const exclusions = buildIngredientExclusionList(
    [...template.restrictions, ...client.allergies],
    client.foodDislikes,
    metabolicConditions,
  );
  const availableFoods = filterFoodByExclusions(foodDatabase, exclusions);

  // STEP 7: Meal selection with biological rules — use template meal slots
  const SLOT_TYPE_TO_FOOD_SLOT: Record<string, string> = {
    breakfast: 'breakfast', morning_snack: 'snack_am', lunch: 'lunch',
    afternoon_snack: 'snack_pm', dinner: 'dinner', evening_snack: 'snack_pm',
    pre_workout: 'snack_pm', post_workout: 'snack_pm',
  };

  // IT-19: za 5-obrok standardni raspored, override-uj calorie percentages
  // na bazi metabolickog profila (IR dobija 28/10/32/10/20, ostale 25/12/30/
  // 13/20). Ako slot type nije u distribuciji (npr. pre_workout, evening_snack),
  // koristi se template-ov caloriePercentage kao fallback.
  const calorieDistribution = pickMealCalorieDistribution(metabolicConditions);
  const distributionKeys = new Set<string>(Object.keys(calorieDistribution));
  const allDistributionKeysPresent = template.mealSlots.every(s =>
    distributionKeys.has(s.type),
  ) && template.mealSlots.length === Object.keys(calorieDistribution).length;

  const mealSlots: MealSlotConfig[] = template.mealSlots
    .sort((a, b) => a.order - b.order)
    .map(s => {
      const distPct = allDistributionKeysPresent
        ? (calorieDistribution as Record<string, number>)[s.type]
        : undefined;
      const calPct = distPct !== undefined ? distPct : s.caloriePercentage / 100;
      return {
        slot: SLOT_TYPE_TO_FOOD_SLOT[s.type] || s.type,
        label: s.label,
        calPct,
        minProtein: s.minProteinGrams,
        maxProtein: s.minProteinGrams + PROTEIN_RANGE_PER_SLOT_G,
        isMainMeal: ['breakfast', 'lunch', 'dinner'].includes(s.type),
        templateType: s.type,
      };
    });

  const postWorkoutSlot = template.mealSlots.find(s => s.type === 'post_workout' || s.type === 'afternoon_snack')?.type;
  const postWorkoutFoodSlot = postWorkoutSlot ? (SLOT_TYPE_TO_FOOD_SLOT[postWorkoutSlot] || postWorkoutSlot) : null;
  const usedIds = new Set<string>();

  const meals: GeneratedMeal[] = mealSlots.map(slotConfig => {
    const targetCal = Math.round(dailyCalories * slotConfig.calPct);
    const targetProtein = Math.round(proteinGrams * slotConfig.calPct);
    const isPostWorkout = postWorkoutFoodSlot === slotConfig.slot;

    let slotFoods = availableFoods.filter(f => f.mealSlots.includes(slotConfig.slot) && !usedIds.has(f.id));
    if (slotFoods.length === 0) slotFoods = availableFoods.filter(f => f.mealSlots.includes(slotConfig.slot));
    if (slotFoods.length === 0) slotFoods = availableFoods;

    // GI Timing Rule
    if (!isPostWorkout) {
      if (metabolicAdjustments.includes('insulin_resistance')) {
        const lowGi = slotFoods.filter(f => f.glycemicIndex === 'low');
        if (lowGi.length > 0) slotFoods = lowGi;
      } else {
        slotFoods = [...slotFoods].sort((a, b) => {
          const giScore: Record<string, number> = { low: 0, medium: 1, high: 2 };
          return (giScore[a.glycemicIndex] || 1) - (giScore[b.glycemicIndex] || 1);
        });
      }
    }

    // Antagonism: no raw fruit at dinner
    if (slotConfig.slot === 'dinner') {
      const filtered = slotFoods.filter(f => !f.tags?.includes('raw-fruit-heavy'));
      if (filtered.length > 0) slotFoods = filtered;
    }

    // Anti-inflammatory priority for PCOS
    if (metabolicAdjustments.includes('pcos')) {
      slotFoods = [...slotFoods].sort((a, b) => {
        const score = (f: FoodItem) => (f.tags?.includes('anti-inflammatory') || f.tags?.includes('omega-3')) ? -1 : 0;
        return score(a) - score(b);
      });
    }

    // Anti-inflammatory priority for Hashimoto (pocetnici.md §1.1)
    if (metabolicAdjustments.includes('hashimoto')) {
      slotFoods = [...slotFoods].sort((a, b) => {
        const score = (f: FoodItem) => (f.tags?.includes('anti-inflammatory') || f.tags?.includes('omega-3')) ? -1 : 0;
        return score(a) - score(b);
      });
    }

    // Anemija: prioritet heme iron izvori (crveno meso, jetra) + vit-C
    // pairing za bolju resorpciju (pocetnici.md §1.1).
    if (metabolicAdjustments.includes('anemia')) {
      slotFoods = [...slotFoods].sort((a, b) => {
        const score = (f: FoodItem) => {
          let s = 0;
          if (f.tags?.includes('heme_iron') || f.tags?.includes('red-meat') || f.tags?.includes('liver')) s -= 2;
          if (f.tags?.includes('vitamin_c') || f.tags?.includes('vitamin-c')) s -= 1;
          return s;
        };
        return score(a) - score(b);
      });
    }

    // A/B/C rotacija — top 3 kandidata, biramo po dnevnom rotation index-u.
    // Iste makroe, različita jela; ako je rotationIndex undefined, biramo prvi.
    const topMatches = findTopMatches(slotFoods, targetCal, targetProtein, slotConfig.minProtein, TOP_MATCHES_FOR_ROTATION);
    const variantIdx = topMatches.length > 0
      ? ((rotationIndex ?? 0) % topMatches.length)
      : 0;
    const bestMatch = topMatches[variantIdx] ?? null;

    if (!bestMatch) {
      // Defense in depth: ako je availableFoods prazan (caller je trebao da
      // bail-uje pre poziva), preskoči slot umesto da padnemo u undefined.
      if (availableFoods.length === 0) {
        return {
          slot: slotConfig.slot as GeneratedMeal['slot'],
          slotLabel: slotConfig.label,
          mealId: '',
          name: '',
          calories: targetCal,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          portionMultiplier: 1,
          glycemicIndex: 'medium' as const,
          isPostWorkout,
          synergyNotes: [],
        };
      }
      return createMealFromFood(availableFoods[0], slotConfig, targetCal, isPostWorkout);
    }

    usedIds.add(bestMatch.id);
    const portionMultiplier = Math.round((bestMatch.calories > 0 ? targetCal / bestMatch.calories : 1) * 100) / 100;
    const synergyNotes = detectSynergies(bestMatch);

    return {
      slot: slotConfig.slot as GeneratedMeal['slot'],
      slotLabel: slotConfig.label,
      mealId: bestMatch.id,
      name: bestMatch.name,
      calories: targetCal,
      protein: Math.round(bestMatch.protein * portionMultiplier),
      carbs: Math.round(bestMatch.carbs * portionMultiplier),
      fat: Math.round(bestMatch.fat * portionMultiplier),
      fiber: Math.round((bestMatch.fiber || 0) * portionMultiplier),
      portionMultiplier,
      glycemicIndex: bestMatch.glycemicIndex || 'medium',
      isPostWorkout,
      synergyNotes,
    };
  });

  // IT-19: IR mini-meal transformacija na GeneratedMeal[] nivou.
  // Za IR klijentkinje sa 5-obrok standardnim rasporedom, slotovi 2 i 4
  // (morning_snack i afternoon_snack) postaju P+F mini-obroci: carbs = 0,
  // slotType = 'mini_meal_ir', label "Mini-obrok (P+F)". Makroi se
  // prilagodjavaju (carbs kcal → fat) da kalorija ostane konstantna.
  const finalMeals: GeneratedMeal[] = applyIRMiniMealMarkers(
    meals,
    metabolicConditions,
    mealSlots,
  );

  // Summary insight
  insights.push({
    type: 'info', icon: '📊',
    title: 'insight.overviewTitle',
    description: `${dailyCalories} kcal/day · ${proteinGrams}g protein (${Math.round(proteinGrams / client.weight * 10) / 10}g/kg) · 7-day fixed plan`,
  });

  // Per-meal protein validator (pocetnici.md §3.4 mTOR Protokol):
  // Standardni obrok mora imati 25-30g proteina za kontinuiranu mTOR aktivaciju.
  // Mini-obroci (IR P+F) se izuzimaju jer su namerno manji.
  const lowProteinMeals = finalMeals.filter(m =>
    m.slotType !== 'mini_meal_ir' &&
    m.protein > 0 &&
    m.protein < PROTEIN_FLOOR_PER_MEAL_G,
  );
  if (lowProteinMeals.length > 0) {
    insights.push({
      type: 'warning', icon: '⚠️',
      title: 'insight.lowMealProtein',
      description: `${lowProteinMeals.length} obrok(a) ispod ${PROTEIN_FLOOR_PER_MEAL_G}g proteina ` +
        `(${lowProteinMeals.map(m => `${m.slotLabel}=${Math.round(m.protein)}g`).join(', ')}). ` +
        `mTOR aktivacija je suboptimalna — razmotri jaču protein opciju za te slotove.`,
    });
  }

  return {
    dailyCalories,
    trainingDayCalories,
    restDayCalories,
    macros: { protein: proteinGrams, carbs: carbsGrams, fat: fatGrams },
    meals: finalMeals,
    insights,
    metabolicAdjustments,
  };
}

// ── IR mini-meal markers (IT-19) ──
//
// Pure helper — vraca novi niz GeneratedMeal sa obelezenim slotovima 2 i 4
// kao mini_meal_ir ako klijentkinja ima insulin_resistance.
//
// Biologija (Spec 02 Sekcija 6.4): IR klijentkinja mora imati "insulin-free
// windows" izmedju main meal-ova, inace insulin hronicno povisen → blokira
// lipolizu. Slotovi 2 i 4 su P+F: nula carbs, kalorije koje bi otisle na
// carbs prebacuju se na fat za sitost. Ovim ostaje tacno 5 obroka, total
// kalorija ostaje ista, ali slot 2 i 4 postaju mini P+F.
function applyIRMiniMealMarkers(
  meals: GeneratedMeal[],
  metabolicConditions: MetabolicCondition[],
  slotConfigs: MealSlotConfig[],
): GeneratedMeal[] {
  if (!metabolicConditions.includes('insulin_resistance')) return meals;
  if (meals.length < IR_MINI_MEAL_MIN_SLOT_COUNT) return meals;

  return meals.map((meal, index) => {
    const slotConfig = slotConfigs[index];
    // Mini-meal samo za morning_snack (slot 2) i afternoon_snack (slot 4)
    const isMiniSlot =
      slotConfig?.templateType === 'morning_snack' ||
      slotConfig?.templateType === 'afternoon_snack';
    if (!isMiniSlot) return { ...meal, slotType: 'standard' as const };

    // Prebaci carbs kcal → fat (4 kcal/g carbs → 9 kcal/g fat).
    // Total kcal ostaje konstantan, carbs = 0.
    const carbKcal = meal.carbs * CARBS_KCAL_PER_G;
    const fatKcalBoost = Math.round(carbKcal / FAT_KCAL_PER_G);

    return {
      ...meal,
      slotType: 'mini_meal_ir' as const,
      slotLabel: 'Mini-obrok (P+F)',
      carbs: 0,
      fat: meal.fat + fatKcalBoost,
    };
  });
}

// ── TEMPLATE MATCHING ──

export function findMatchingTemplates(
  clientProfile: { goal: string; experience: string; frequency: number; limitations: string[] },
  templates: NutritionTemplate[]
): NutritionTemplate[] {
  return templates
    .map(template => {
      let score = 0;
      const tags = template.tags.map(t => t.toLowerCase());
      if (clientProfile.goal === 'fat_loss' && tags.includes('fat_loss')) score += TEMPLATE_SCORE_GOAL_MATCH;
      if (clientProfile.goal === 'figure' && tags.includes('figure')) score += TEMPLATE_SCORE_GOAL_MATCH;
      if (clientProfile.goal === 'health' && tags.includes('health')) score += TEMPLATE_SCORE_GOAL_MATCH;
      if (clientProfile.goal === 'muscle_gain' && tags.includes('muscle_gain')) score += TEMPLATE_SCORE_GOAL_MATCH;
      if (tags.includes(clientProfile.experience)) score += TEMPLATE_SCORE_EXPERIENCE_MATCH;
      if (tags.includes(`${clientProfile.frequency}_days_week`)) score += TEMPLATE_SCORE_FREQUENCY_MATCH;
      clientProfile.limitations.forEach(l => { if (tags.includes(`safe_${l}`)) score += TEMPLATE_SCORE_LIMITATION_SAFE; });
      if (tags.includes('free_trial')) score += TEMPLATE_SCORE_FREE_TRIAL;
      return { template, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.template);
}

// ── MOCK TEMPLATES ──

export const DEFAULT_5_MEAL_SLOTS: TemplateMealSlot[] = [
  { id: '1', order: 1, type: 'breakfast', label: 'Doručak', caloriePercentage: 25, minProteinGrams: 30 },
  { id: '2', order: 2, type: 'morning_snack', label: 'Užina', caloriePercentage: 10, minProteinGrams: 15 },
  { id: '3', order: 3, type: 'lunch', label: 'Ručak', caloriePercentage: 30, minProteinGrams: 30 },
  { id: '4', order: 4, type: 'afternoon_snack', label: 'Užina', caloriePercentage: 10, minProteinGrams: 15 },
  { id: '5', order: 5, type: 'dinner', label: 'Večera', caloriePercentage: 25, minProteinGrams: 30 },
];

export const MEAL_PRESETS: Record<number, TemplateMealSlot[]> = {
  3: [
    { id: '1', order: 1, type: 'breakfast', label: 'Doručak', caloriePercentage: 30, minProteinGrams: 40 },
    { id: '2', order: 2, type: 'lunch', label: 'Ručak', caloriePercentage: 35, minProteinGrams: 45 },
    { id: '3', order: 3, type: 'dinner', label: 'Večera', caloriePercentage: 35, minProteinGrams: 40 },
  ],
  4: [
    { id: '1', order: 1, type: 'breakfast', label: 'Doručak', caloriePercentage: 25, minProteinGrams: 35 },
    { id: '2', order: 2, type: 'lunch', label: 'Ručak', caloriePercentage: 30, minProteinGrams: 40 },
    { id: '3', order: 3, type: 'afternoon_snack', label: 'Užina', caloriePercentage: 15, minProteinGrams: 20 },
    { id: '4', order: 4, type: 'dinner', label: 'Večera', caloriePercentage: 30, minProteinGrams: 35 },
  ],
  5: DEFAULT_5_MEAL_SLOTS,
  6: [
    { id: '1', order: 1, type: 'breakfast', label: 'Doručak', caloriePercentage: 20, minProteinGrams: 25 },
    { id: '2', order: 2, type: 'morning_snack', label: 'Jutarnja užina', caloriePercentage: 10, minProteinGrams: 15 },
    { id: '3', order: 3, type: 'lunch', label: 'Ručak', caloriePercentage: 25, minProteinGrams: 30 },
    { id: '4', order: 4, type: 'afternoon_snack', label: 'Popodnevna užina', caloriePercentage: 10, minProteinGrams: 15 },
    { id: '5', order: 5, type: 'dinner', label: 'Večera', caloriePercentage: 25, minProteinGrams: 25 },
    { id: '6', order: 6, type: 'evening_snack', label: 'Večernja užina', caloriePercentage: 10, minProteinGrams: 15 },
  ],
};

// ============================================================================
// generateMealPlanWeek — 7-dnevni plan sa A/B/C rotacijom
// ============================================================================
//
// Iste makroe, različita jela kroz nedelju. Klijent dobija varijaciju a
// algoritam i dalje pogađa target kcal/protein/carbs/fat.
//
// rotationIndex per day: [0, 1, 2, 0, 1, 2, 0] (7 dana = 3 varijante × 2 + 1)

export interface MealPlanWeek {
  /** 7 dana, indeksiranih 0..6 (0 = ponedeljak). Svaki dan je validan plan. */
  days: GeneratedMealPlan[];
  /** Najmanja zajednička metrika nedelje (target kcal — isti za sve dane). */
  dailyCalories: number;
}

export function generateMealPlanWeek(
  client: ClientProfile,
  template: NutritionTemplate,
  foodDatabase: FoodItem[],
  trainingSchedule?: { trainingDays: number[] },
  cyclePhase?: NutritionCyclePhase | null,
): MealPlanWeek {
  const days: GeneratedMealPlan[] = [];
  for (let dayIdx = 0; dayIdx < DAYS_PER_WEEK; dayIdx++) {
    const rotationIndex = dayIdx % MEAL_ROTATION_VARIANTS;        // 0,1,2,0,1,2,0
    days.push(
      generateMealPlan(
        client, template, foodDatabase, trainingSchedule, cyclePhase, rotationIndex,
      ),
    );
  }
  const dailyCalories = days[0]?.dailyCalories ?? 0;
  return { days, dailyCalories };
}

// ============================================================================
// findSimilarMeals — auto-swap kandidati po macro sličnosti
// ============================================================================
//
// Za dato jelo (currentMealId), vrati N alternativa iz availableFoods koji
// pogađaju isti slot, ±tolerance% kalorija/proteina, prošli alergi/metab.
// Filter — caller je vec primenio antiIngredientFilter na availableFoods.

export interface FindSimilarOptions {
  /** ±tolerance fraction (0.10 = ±10%). Default 0.10. */
  tolerance?: number;
  /** Max kandidata vraceno. Default 5. */
  topN?: number;
}

export function findSimilarMeals(
  currentMeal: { mealId: string; calories: number; protein: number; slot: string },
  availableFoods: FoodItem[],
  options: FindSimilarOptions = {},
): FoodItem[] {
  const { tolerance = SIMILAR_MEAL_TOLERANCE, topN = SIMILAR_MEAL_TOP_N } = options;
  const targetCal = currentMeal.calories;
  const targetProtein = Math.max(1, currentMeal.protein);

  const candidates = availableFoods.filter(f => {
    if (f.id === currentMeal.mealId) return false;
    if (!f.mealSlots.includes(currentMeal.slot as never)) return false;
    const calDelta = Math.abs(f.calories - targetCal) / Math.max(1, targetCal);
    const protDelta = Math.abs(f.protein - targetProtein) / targetProtein;
    return calDelta <= tolerance && protDelta <= tolerance;
  });

  // Sortiraj po blizini (manja delta = bolji match)
  return candidates
    .map(f => ({
      food: f,
      score:
        Math.abs(f.calories - targetCal) +
        Math.abs(f.protein - targetProtein) * 2,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, topN)
    .map(x => x.food);
}
