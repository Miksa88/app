// ============================================================================
// nutritionTemplateService — CRUD za nutrition_templates (W-7 wire-up)
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { NutritionTemplate, TemplateMealSlot } from "@/utils/mealPlanGenerator";

type Row = Database["public"]["Tables"]["nutrition_templates"]["Row"];

export interface NutritionTemplateRecord extends NutritionTemplate {
  trainerId: string;
  isArchived: boolean;
  updatedAt: string;
}

function toRecord(row: Row): NutritionTemplateRecord {
  const macroRatio = (row.macro_ratio as { protein: number; carbs: number; fat: number } | null) ?? { protein: 30, carbs: 40, fat: 30 };
  const calorieRange = row.calorie_range as { min: number; max: number } | null;
  return {
    id: row.id,
    trainerId: row.trainer_id,
    name: row.name,
    description: row.description ?? "",
    goalType: row.goal_type as NutritionTemplate["goalType"],
    macroRatio,
    macroPreset: row.macro_preset,
    calorieStrategy: row.calorie_strategy as NutritionTemplate["calorieStrategy"],
    fixedCalories: row.fixed_calories ?? undefined,
    calorieRange: calorieRange ?? undefined,
    trainingDayModifier: row.training_day_modifier ?? undefined,
    restDayModifier: row.rest_day_modifier ?? undefined,
    differentOnTrainingDays: row.different_on_training_days,
    restrictions: row.restrictions ?? [],
    tags: row.tags ?? [],
    mealCount: row.meal_count,
    mealSlots: (row.meal_slots as unknown as TemplateMealSlot[]) ?? [],
    createdAt: row.created_at,
    isArchived: row.is_archived,
    updatedAt: row.updated_at,
  };
}

export async function listTrainerNutritionTemplates(trainerId: string): Promise<NutritionTemplateRecord[]> {
  const { data, error } = await supabase
    .from("nutrition_templates")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listTrainerNutritionTemplates: ${error.message}`);
  return (data ?? []).map(toRecord);
}

export async function getNutritionTemplateById(id: string): Promise<NutritionTemplateRecord | null> {
  const { data, error } = await supabase
    .from("nutrition_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getNutritionTemplateById: ${error.message}`);
  return data ? toRecord(data) : null;
}

export interface UpsertNutritionTemplateInput {
  id?: string;
  trainerId: string;
  name: string;
  description?: string;
  goalType: NutritionTemplate["goalType"];
  macroRatio: { protein: number; carbs: number; fat: number };
  macroPreset: string;
  calorieStrategy: NutritionTemplate["calorieStrategy"];
  fixedCalories?: number;
  calorieRange?: { min: number; max: number };
  trainingDayModifier?: number;
  restDayModifier?: number;
  differentOnTrainingDays: boolean;
  restrictions: string[];
  tags: string[];
  mealCount: number;
  mealSlots: TemplateMealSlot[];
}

/**
 * Pretražuje sve nutrition template-e sa `default_for_<level>` tag-om za auto-assignment
 * pri client onboarding-u. Vraća prvi match (najsvežiji updated_at) ili null
 * ako trener nije obeležio nijedan template kao default za taj nivo.
 */
export async function findDefaultNutritionTemplateForLevel(
  level: "beginner" | "intermediate" | "advanced",
): Promise<NutritionTemplateRecord | null> {
  const tag = `default_for_${level}`;
  const { data, error } = await supabase
    .from("nutrition_templates")
    .select("*")
    .contains("tags", [tag])
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`findDefaultNutritionTemplateForLevel: ${error.message}`);
  return data && data.length > 0 ? toRecord(data[0]) : null;
}

export async function upsertNutritionTemplate(input: UpsertNutritionTemplateInput): Promise<NutritionTemplateRecord> {
  const payload = {
    trainer_id: input.trainerId,
    name: input.name,
    description: input.description ?? null,
    goal_type: input.goalType,
    macro_ratio: input.macroRatio as unknown as Database["public"]["Tables"]["nutrition_templates"]["Insert"]["macro_ratio"],
    macro_preset: input.macroPreset,
    calorie_strategy: input.calorieStrategy,
    fixed_calories: input.fixedCalories ?? null,
    calorie_range: (input.calorieRange ?? null) as unknown as Database["public"]["Tables"]["nutrition_templates"]["Insert"]["calorie_range"],
    training_day_modifier: input.trainingDayModifier ?? null,
    rest_day_modifier: input.restDayModifier ?? null,
    different_on_training_days: input.differentOnTrainingDays,
    restrictions: input.restrictions,
    tags: input.tags,
    meal_count: input.mealCount,
    meal_slots: input.mealSlots as unknown as Database["public"]["Tables"]["nutrition_templates"]["Insert"]["meal_slots"],
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("nutrition_templates")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(`upsertNutritionTemplate(update): ${error.message}`);
    return toRecord(data);
  }
  const { data, error } = await supabase
    .from("nutrition_templates")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(`upsertNutritionTemplate(insert): ${error.message}`);
  return toRecord(data);
}

export async function archiveNutritionTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("nutrition_templates")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) throw new Error(`archiveNutritionTemplate: ${error.message}`);
}
