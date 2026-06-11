// ============================================================================
// mealPlan/types — zajednički interfejsi za meal plan generator pipeline
// Izvučeno iz src/utils/mealPlanGenerator.ts (refaktor split, zero behavior change)
// ============================================================================

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

export interface MealSlotConfig {
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
