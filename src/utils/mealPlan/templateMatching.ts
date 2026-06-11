// ============================================================================
// mealPlan/templateMatching — scoring nutrition template-a + default presets
// Izvučeno iz src/utils/mealPlanGenerator.ts (refaktor split, zero behavior change)
// ============================================================================

import {
  TEMPLATE_SCORE_GOAL_MATCH,
  TEMPLATE_SCORE_EXPERIENCE_MATCH,
  TEMPLATE_SCORE_FREQUENCY_MATCH,
  TEMPLATE_SCORE_LIMITATION_SAFE,
  TEMPLATE_SCORE_FREE_TRIAL,
} from "@/constants/nutritionConstants";
import type { NutritionTemplate, TemplateMealSlot } from "./types";

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
