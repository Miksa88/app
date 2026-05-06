// ============================================================================
// mealLogService — orkestrator meal log flow-a + metabolic noise detection
// Spec: 02_NUTRITION_FLOW_MASTER.md Sekcija 13 (Daily Logging) +
//       03_INTEGRATION_LAYER.md Sekcija 3.2 Rule 6 (Metabolic noise)
// ============================================================================
//
// Glavni event-i:
//   - logMeal: snimi meal log + recompute hydration/noise tracking
//   - getDailyTotals: izracunaj dnevni rollup iz meal_logs (zamena za bivsi
//                     daily_nutrition_logs tabelu)
//
// Sync Rule 6 (metabolic noise) okida ovde — ako je tecnih kalorija > 10%
// dnevnog budzeta, postavlja `isMetabolicNoiseTriggered = true` i sledeci
// runSyncRules ce blokirati plan adjustment 3 dana.
// ============================================================================

import type { UserStatus } from '@/types/userStatus';
import type { MealStatus } from '@/types/nutrition';
import { supabase } from '@/integrations/supabase/client';
import { updateUserStatus } from '@/utils/db/userStatus';
import { calcRedFlags } from '@/utils/sync/redFlags';
import { runSyncRules, EventBus } from '@/utils/sync/syncEngine';

const METABOLIC_NOISE_THRESHOLD = 0.10;  // > 10% dnevnog budzeta = noise

// ============================================================================
// LogMealInput — sve sto treba za upis u meal_logs
// ============================================================================

export interface LogMealInput {
  clientId: string;
  mealId: string;
  mealSlotIndex: number;            // 0–4 (breakfast..dinner)
  status: MealStatus;
  caloriesActual: number;
  proteinActual: number;
  carbsActual: number;
  fatActual: number;
  wasLiquidCalories?: boolean;      // KRITICAN flag za Sync Rule 6
  replacementMealId?: string;
  notes?: string;
  hydrationMlAdded?: number;        // ako je liquid + non-zero, dodaj u hidraciju
}

// ============================================================================
// logMeal — snimi log + update UserStatus
// ============================================================================

export async function logMeal(input: LogMealInput): Promise<UserStatus> {
  // 1. Insert u meal_logs tabelu (Faza 1 šemu)
  const status: 'logged' | 'skipped' | 'replaced' =
    input.status === 'completed' ? 'logged' :
    input.status === 'skipped' ? 'skipped' :
    input.status === 'replaced' ? 'replaced' :
    'logged';

  const { error: insertErr } = await supabase
    .from('meal_logs')
    .insert({
      user_id: input.clientId,
      meal_id: input.mealId,
      meal_slot_index: input.mealSlotIndex,
      status,
      calories_actual: input.caloriesActual,
      protein_actual: input.proteinActual,
      carbs_actual: input.carbsActual,
      fat_actual: input.fatActual,
      was_liquid_calories: input.wasLiquidCalories ?? false,
      replacement_meal_id: input.replacementMealId ?? null,
      notes: input.notes ?? null,
    });

  if (insertErr) {
    throw new Error(`logMeal(${input.mealId}) insert failed: ${insertErr.message}`);
  }

  // 2. Recompute liquid kalorije za poslednjih 24h i metabolic noise flag
  const liquidKcal24h = await getLiquidCaloriesLast24h(input.clientId);

  // 3. Update UserStatus (hydration + noise + skip count)
  const newStatus = await updateUserStatus(
    input.clientId,
    async (s) => {
      // Hidracija — ako je piece-of-water log (npr. flat caso), dodaj
      if (input.hydrationMlAdded) {
        s.nutrition.hydrationTodayMl += input.hydrationMlAdded;
      }

      // Metabolic noise check (Spec 03 Rule 6)
      const noiseRatio = s.nutrition.currentCalorieTarget > 0
        ? liquidKcal24h / s.nutrition.currentCalorieTarget
        : 0;
      const wasTriggered = s.nutrition.isMetabolicNoiseTriggered;
      s.nutrition.isMetabolicNoiseTriggered = noiseRatio > METABOLIC_NOISE_THRESHOLD;

      // Red flags update (skip ili noise inkrement)
      s.redFlags = calcRedFlags({
        status: s,
        incrementSkipCount: input.status === 'skipped' ? 1 : 0,
        incrementMetabolicNoiseDays:
          (s.nutrition.isMetabolicNoiseTriggered && !wasTriggered) ? 1 : 0,
      });
    },
    runSyncRules,
  );

  // 4. Emit events
  await EventBus.emit({
    type: 'MEAL_LOGGED',
    clientId: input.clientId,
    mealId: input.mealId,
    status,
    loggedAt: new Date(),
  });

  if (input.status === 'skipped') {
    await EventBus.emit({
      type: 'MEAL_SKIPPED',
      clientId: input.clientId,
      mealId: input.mealId,
      isProtein: input.proteinActual > 20,  // mTOR threshold (Spec 02 Sekcija 6.1)
    });
  }

  if (newStatus.nutrition.isMetabolicNoiseTriggered) {
    const noiseRatio = newStatus.nutrition.currentCalorieTarget > 0
      ? liquidKcal24h / newStatus.nutrition.currentCalorieTarget
      : 0;
    await EventBus.emit({
      type: 'METABOLIC_NOISE_TRIGGERED',
      clientId: input.clientId,
      percentage: Math.round(noiseRatio * 100),
    });
  }

  return newStatus;
}

// ============================================================================
// getLiquidCaloriesLast24h — agregacija za Sync Rule 6
// ============================================================================
//
// Indeksiran upit (vidi Faza 1 migration: idx_meal_logs_liquid_recent).

export async function getLiquidCaloriesLast24h(clientId: string): Promise<number> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('meal_logs')
    .select('calories_actual')
    .eq('user_id', clientId)
    .eq('was_liquid_calories', true)
    .gte('logged_at', yesterday);

  if (error) {
    throw new Error(`getLiquidCaloriesLast24h(${clientId}) failed: ${error.message}`);
  }

  return (data ?? []).reduce((sum, row) => sum + Number(row.calories_actual ?? 0), 0);
}

// ============================================================================
// getDailyTotals — zamena za bivsu daily_nutrition_logs tabelu
// ============================================================================
//
// Computed view-style funkcija — racuna iz meal_logs sve danasnje rollup-e.
// UI komponente koje su pre koristile daily_nutrition_logs sada zovu ovo.

export interface DailyTotals {
  date: string;
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  mealsLogged: number;
  mealsSkipped: number;
  liquidCalories: number;
}

export async function getDailyTotals(
  clientId: string,
  date: Date = new Date(),
): Promise<DailyTotals> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', clientId)
    .gte('logged_at', startOfDay.toISOString())
    .lte('logged_at', endOfDay.toISOString());

  if (error) {
    throw new Error(`getDailyTotals(${clientId}) failed: ${error.message}`);
  }

  const rows = data ?? [];
  return {
    date: date.toISOString().slice(0, 10),
    caloriesConsumed: rows.reduce((s, r) => s + Number(r.calories_actual ?? 0), 0),
    proteinConsumed: rows.reduce((s, r) => s + Number(r.protein_actual ?? 0), 0),
    carbsConsumed: rows.reduce((s, r) => s + Number(r.carbs_actual ?? 0), 0),
    fatConsumed: rows.reduce((s, r) => s + Number(r.fat_actual ?? 0), 0),
    mealsLogged: rows.filter(r => r.status === 'logged' || r.status === 'replaced').length,
    mealsSkipped: rows.filter(r => r.status === 'skipped').length,
    liquidCalories: rows.filter(r => r.was_liquid_calories).reduce((s, r) => s + Number(r.calories_actual ?? 0), 0),
  };
}
