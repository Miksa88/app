// ============================================================================
// Nutrition types
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 11 (FoodItem) + Sekcija 14 (Data modeli)
//       + Sekcija 13 (Daily logging)
// ============================================================================

import type { MetabolicCondition } from './training';

// ============================================================================
// Goal mode i target
// ============================================================================

export type CalorieTargetMode = 'deficit' | 'recomposition' | 'lean_bulk' | 'maintenance';

export interface CaloricTarget {
  dailyTarget: number;
  trainingDayTarget: number;
  restDayTarget: number;
  mode: CalorieTargetMode;
  weeklyDeficit: number;
}

// ============================================================================
// MacroTarget (Sekcija 14)
// ============================================================================

export interface MacroTarget {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberMinG: number;            // min 25g/dan
  sodiumMaxMg?: number;         // za hipertenziju
  potassiumMinMg?: number;
  omega3MinG?: number;          // za PCOS
  maxAllowedGI?: number;        // za IR/PCOS
  antiInflammatoryFlag?: boolean; // za Hashimoto

  // Privremeni modifikatori (sync rule overrides — bonus/buffer)
  fatBonus?: number;
  carbBonusG?: number;
  lutealActive?: boolean;
}

// ============================================================================
// Hormonal mode (Sekcija 2.2)
// ============================================================================

export type HormonalMode = 'standard' | 'hormonal_aware';

// Spec 02 Sekcija 2 koristi 4 faze; finije podele za volume bonus su u
// training.ts (CyclePhase). Ovde držimo 4-phase enum sinhron sa training.
export type NutritionCyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface HormonalAwareState {
  active: boolean;
  mode: HormonalMode;
  currentCycleDay?: number;
  currentPhase?: NutritionCyclePhase;
  appliedModifiers?: string[];   // npr. ['luteal_phase_bonus']
}

// ============================================================================
// Anti-Ingredient Filter (Sekcija 2.3)
// ============================================================================

export interface IngredientExclusionList {
  hardExclusions: string[];      // alergije + patološke ekskluzije — NIKAD u plan
  softExclusions: string[];      // averzije — izbegava ali fallback može
}

// ============================================================================
// FoodItem i tagovanje (Sekcija 11)
// ============================================================================

export type MealCategory =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner';

export type FoodTag =
  // Patološki
  | 'low_gi'              // GI < 40
  | 'medium_gi'           // GI 40–55
  | 'high_gi'             // GI > 55
  | 'anti_inflammatory'
  | 'inflammatory'
  | 'high_gluten'
  | 'gluten_free'
  | 'lactose_free'
  | 'high_sodium'         // >600mg
  | 'low_sodium'          // <200mg
  | 'high_potassium'      // >400mg
  | 'omega3_rich'         // >1g
  | 'hashimoto_safe'
  | 'ir_friendly'
  | 'pcos_friendly'
  | 'hypertension_safe'
  // Nutrient timing
  | 'pre_workout'
  | 'post_workout'
  | 'fast_digestion'
  | 'slow_digestion'
  // Kulinarski
  | 'high_protein'        // >25g
  | 'high_fiber'          // >5g
  | 'snack'
  | 'meal'
  | 'vegetarian'
  | 'vegan'
  | 'dairy_free';

export interface FoodItem {
  id: number;
  name: string;
  nameSr: string;
  category: MealCategory;

  // Makronutrijenti (po porciji)
  servingSizeG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;

  // Mikronutrijenti za patologije
  sodiumMg: number;
  potassiumMg: number;
  omega3G: number;

  // Glikemija
  glycemicIndex: number;        // 0–100
  glycemicLoad: number;

  tags: FoodTag[];

  // Anti-Ingredient sistem
  ingredientsList: string[];
  allergensList: string[];

  // Nutrient timing
  fastDigestion: boolean;
  highFiber: boolean;

  // Trener override
  isCustom: boolean;
  createdByTrainerId?: string;

  // Mediji
  imageUrl?: string;
  prepTimeMin?: number;
}

// ============================================================================
// Meal slots i meal plan (Sekcija 6 + 12)
// ============================================================================

export type MealRole = 'regular' | 'pre_workout' | 'post_workout';

export type MealSlotType = 'standard' | 'mini_meal_ir';  // Sekcija 6.4

export interface MealSlot {
  slotId: string;
  category: MealCategory;
  preferredTime: string;        // "13:00"
  role: MealRole;
  slotType?: MealSlotType;

  // Macro target za ovaj slot
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;

  // IR-specifični overrides (Sekcija 6.4)
  allowedFoodTags?: FoodTag[];
  forbiddenFoodTags?: FoodTag[];
  mealGap?: number;             // min izmedju obroka (180 za IR)
  label?: string;
  uiNote?: string;
}

export type MealStatus = 'pending' | 'completed' | 'replaced' | 'skipped';

export interface PlannedMeal {
  slotId: string;
  category: MealCategory;
  scheduledTime: string;
  role: MealRole;
  food: FoodItem;
  portionMultiplier: number;    // 1.0 = standardna porcija
  status: MealStatus;
  replacedWith?: FoodItem;
  skippedAt?: Date;
}

export interface DailyMealPlan {
  id: string;
  clientId: string;
  date: Date;
  dayType: 'A' | 'B';
  isTrainingDay: boolean;
  meals: PlannedMeal[];
  totalCalories: number;
  totalMacros: {
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  macroDeviation: number;       // % od target-a, idealno < 5%
  appliedModifiers: string[];   // ['luteal_phase_bonus', 'sleep_penalty', ...]
  notes: string[];
}

// ============================================================================
// FoodPreferences (Sekcija 2.2)
// ============================================================================

export interface FoodPreferences {
  dislikedFoods: string[];
  preferredCuisine?: string[];
  mealsPerDay: 5;               // fiksno za MVP
  preferredMealTimes?: {
    breakfast: string;
    morningSnack: string;
    lunch: string;
    afternoonSnack: string;
    dinner: string;
  };
  workoutTime?: string;
  cycleTrackingEnabled: boolean;
  lastPeriodStartDate?: Date;
}

// ============================================================================
// Daily logging (Sekcija 13)
// ============================================================================

export interface LiquidCaloricEntry {
  description: string;          // "kafa sa mlekom i šećerom"
  estimatedKcal: number;
  estimatedCarbsG: number;
}

export interface MealLog {
  id: string;
  userId: string;
  mealSlotId: string;
  date: Date;
  originalFoodId: number;
  replacementFoodId?: number;
  status: MealStatus;
  loggedAt: Date;

  // Stvarni unos (može da se razlikuje ako je replaced)
  caloriesActual: number;
  proteinActual: number;
  carbsActual: number;
  fatActual: number;

  // KRITIČNO za Sync Rule 6 (metabolic noise)
  wasLiquidCalories: boolean;

  liquidCalories?: LiquidCaloricEntry[];
  notes?: string;
}

// ============================================================================
// Check-in modeli (Sekcija 14)
// ============================================================================

export interface DailyCheckIn {
  clientId: string;
  date: Date;
  weightKg: number;
  energyLevel: number;          // 1–10
  stressLevel: number;          // 1–5
  sleepHours: number;
  waterIntakeMl: number;
  cycleDay?: number;
  notes?: string;
}

export interface WeeklyCheckIn {
  clientId: string;
  weekIndex: number;
  date: Date;
  weightKg: number;
  waistCm: number;
  hipsCm: number;
  thighCm: number;
  energyAvg: number;
  bloatingAvg: number;          // 1–5
  adherenceRate: number;        // 0–1

  // Identity check-in (Sekcija 1 — princip "identitet iznad kalorija")
  identityScore?: number;       // 1–5; 4+ aktivira identity status indikator
  identityNote?: string;
}

export type WeightTrendDirection = 'losing' | 'maintaining' | 'gaining' | 'insufficient_data';

export interface WeightTrend {
  clientId: string;
  movingAverage5d: number;
  trend: WeightTrendDirection;
  weeklyRateKg: number;         // pozitivno = rast, negativno = pad
  dataReliable: boolean;        // false tokom menstrualne faze
}

// ============================================================================
// ClientNutritionProfile (Sekcija 14)
// ============================================================================

export interface ClientNutritionProfile {
  clientId: string;
  bmr: number;
  tdee: number;
  caloricTarget: CaloricTarget;
  macros: MacroTarget;

  // Filteri
  ingredientExclusions: IngredientExclusionList;
  metabolicConditions: MetabolicCondition[];
  foodPool: number[];           // ID-evi jela koji su prošli filtere

  // Trenutni plan
  activeMealPlan: DailyMealPlan | null;
  measurementWeekActive: boolean;
  measurementWeekDay: number;   // 1–7

  // Check-in state
  lastWeeklyCheckIn: WeeklyCheckIn | null;
  weightTrendline: number[];    // poslednjih 10 dnevnih vrednosti

  // Ciklus
  cycleTrackingEnabled: boolean;
  lastPeriodStart: Date | null;
  currentCycleDay: number | null;
  hormonalMode: HormonalMode;

  createdAt: Date;
  lastUpdatedAt: Date;
}
