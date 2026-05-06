// Refaktor (Faza 2.4): internals koriste nove pure formule iz nutrition/.
// Public API (`computePersonalizedPlan`, `buildTrainingReasoning`,
// `buildNutritionReasoning`) ostaje nepromenjen radi backward compat
// sa AnalysisReport.tsx i drugim postojecim komponentama.
import { calcBMR, calcTDEE } from "@/utils/nutrition/bmrTdee";
import { recalcCalorieTarget, CALORIE_FLOOR } from "@/utils/nutrition/calorieTarget";
import { calcMacroSplit } from "@/utils/nutrition/macroSplit";
import type { CalorieTargetMode } from "@/types/nutrition";

export interface OnboardingData {
  firstName?: string;
  dateOfBirth?: string;
  weight?: string | number;
  height?: string | number;
  gender?: string;
  goal?: string;
  experience?: string;
  frequency?: string | number;
  limitations?: string[];
  allergies?: string[];
  foodDislikes?: string[];
  metabolicProfile?: string[];
  sleepQuality?: number;
  stressLevel?: number;
}

export interface PersonalizedPlan {
  age: number;
  weight: number;
  height: number;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  programName: string;
  programDuration: number;
  frequency: number;
  mealCount: number;
  isHighProtein: boolean;
  goalKey: string;
  experienceKey: string;
  adaptations: string[];
  validName: string;
}

function safeNum(val: string | number | undefined, fallback: number): number {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return n && !isNaN(n) && isFinite(n) ? n : fallback;
}

function calcAge(dob: string | undefined): number {
  if (!dob) return 28;
  try {
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return 28;
    return Math.max(16, Math.floor((Date.now() - birth.getTime()) / 31557600000));
  } catch {
    return 28;
  }
}

function mapOnboardingGoalToTargetMode(goal: string): CalorieTargetMode {
  if (goal === "fat_loss" || goal === "figure") return "deficit";
  if (goal === "muscle_gain") return "lean_bulk";
  return "maintenance";
}

function getProgramName(goal: string, experience: string, frequency: number): string {
  if (frequency >= 5) return "PPL Split";
  if (frequency >= 4) return "Upper/Lower";
  if (experience === "beginner") return "Full Body Beginner";
  return "Full Body";
}

export function computePersonalizedPlan(data: OnboardingData): PersonalizedPlan {
  const weight = safeNum(data.weight, 65);
  const height = safeNum(data.height, 168);
  const age = calcAge(data.dateOfBirth);
  const frequency = safeNum(data.frequency, 3);
  const goal = data.goal || "health";
  const experience = data.experience || "beginner";

  // === REFAKTOR (Faza 2.4) — koristimo nove pure formule iz nutrition/ ===
  // BMR — Mifflin-St Jeor zenska formula (Spec 02 Sekcija 3.1)
  // (Zenski default — projekat fitbyivana je iskljucivo za zene)
  const bmr = calcBMR({ weightKg: weight, heightCm: height, age });

  // TDEE = BMR × activity multiplier (Spec 02 Sekcija 3.2)
  const workoutFreq = (frequency >= 3 && frequency <= 5 ? frequency : 4) as 3 | 4 | 5;
  const tdee = calcTDEE({
    bmr,
    workoutFrequency: workoutFreq,
    jobPhysicality: 'sedentary',  // OnboardingData ne nosi jobType — default
  });

  // Calorie target — idempotentno (Spec 03 Sekcija 3.3)
  const targetMode = mapOnboardingGoalToTargetMode(goal);
  let dailyCalories = recalcCalorieTarget({ tdee, targetMode });

  // Beginner protection — agresivni deficit za pocetnice je rizican
  if ((goal === "fat_loss" || goal === "figure") && experience === "beginner") {
    dailyCalories = Math.max(Math.round(tdee * 0.88), CALORIE_FLOOR);  // -12% (blagi)
  }

  // Macro split sa novim formulama (Spec 02 Sekcija 4)
  const macros = calcMacroSplit({ weightKg: weight, totalCalories: dailyCalories });
  const protein = macros.proteinG;
  const carbs = macros.carbsG;
  const fat = macros.fatG;
  const isHighProtein = goal === "fat_loss" || goal === "figure";

  // Program
  const programName = getProgramName(goal, experience, frequency);
  const programDuration = experience === "beginner" ? 8 : experience === "intermediate" ? 10 : 12;

  // Meal count
  const mealCount = dailyCalories > 2200 ? 5 : dailyCalories > 1600 ? 4 : 3;

  // Adaptations (limitations + allergies merged, excluding "none")
  const lims = (data.limitations || []).filter(l => l !== "none");
  const alls = (data.allergies || []).filter(a => a !== "none");
  const adaptations = [...lims, ...alls];

  // Valid name
  const raw = (data.firstName || "").trim();
  const validName = raw.length > 2 && /^[a-zA-ZÀ-žА-я\s]+$/.test(raw) ? raw : "";

  return {
    age, weight, height,
    dailyCalories, protein, carbs, fat,
    programName, programDuration,
    frequency, mealCount, isHighProtein,
    goalKey: goal,
    experienceKey: experience,
    adaptations,
    validName,
  };
}

export function buildTrainingReasoning(
  plan: PersonalizedPlan,
  t: (key: string) => string
): string {
  const parts: string[] = [];
  parts.push(`${t("analysis.reasonProgram")} ${t(`experienceLabel.${plan.experienceKey}`).toLowerCase()}`);
  parts.push(`${t("analysis.reasonGoal")} ${t(`goalLabel.${plan.goalKey}`).toLowerCase()}`);

  if (plan.adaptations.length > 0) {
    const firstLim = plan.adaptations[0];
    const label = t(`limitation.${firstLim}`) !== `limitation.${firstLim}` 
      ? t(`limitation.${firstLim}`) 
      : t(`allergy.${firstLim}`) !== `allergy.${firstLim}` 
        ? t(`allergy.${firstLim}`) 
        : firstLim;
    parts.push(`${t("analysis.reasonAvoids")} ${label}`);
  } else {
    parts.push(t("analysis.reasonMaximize"));
  }

  return parts.join(", ") + ".";
}

export function buildNutritionReasoning(
  plan: PersonalizedPlan,
  data: OnboardingData,
  t: (key: string) => string
): string {
  const parts: string[] = [];
  const goal = plan.goalKey;

  if (goal === "fat_loss" || goal === "figure") {
    parts.push(t("analysis.reasonDeficit"));
  } else if (goal === "muscle_gain") {
    parts.push(t("analysis.reasonSurplus"));
  } else {
    parts.push(t("analysis.reasonBalance"));
  }

  const mp = data.metabolicProfile || [];
  if (mp.includes("insulin_resistance")) {
    parts.push(t("analysis.reasonIR"));
  } else if (mp.includes("pcos")) {
    parts.push(t("analysis.reasonPCOS"));
  } else if (mp.includes("hashimoto")) {
    parts.push(t("analysis.reasonThyroid"));
  } else if (plan.isHighProtein) {
    parts.push(t("analysis.reasonHighProtein"));
  }

  return parts.join(". ") + ".";
}
