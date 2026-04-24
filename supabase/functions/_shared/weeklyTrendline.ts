// ============================================================================
// weeklyTrendline — Deno port (IT-17)
// Verbatim kopija iz `src/utils/nutrition/weeklyTrendline.ts`.
// ============================================================================
//
// Zašto duplikat: Deno Edge Runtime ne deli tsconfig path alias (@/) sa
// src/ stack-om. Umesto importa iz src/, pure logika živi u oba mesta —
// sa testom samo na src/ strani. Pri svakoj izmeni src/ verzije, ovaj fajl
// se ažurira identično.
// ============================================================================

export type WeeklyTrendlineMode = 'deficit' | 'lean_bulk' | 'maintenance' | 'recomposition';

export type WeeklyTrendlineAction =
  | 'status_quo'
  | 'tighten'
  | 'relax'
  | 'bulk_increase'
  | 'bulk_decrease'
  | 'skipped_menstrual';

export interface WeeklyTrendlineInputs {
  currentCalorieTarget: number;
  targetMode: WeeklyTrendlineMode;
  weeklyWeightDelta: number | null;
  weightDataReliable: boolean;
}

export interface WeeklyTrendlineResult {
  newCalorieTarget: number;
  action: WeeklyTrendlineAction;
  reason: string;
}

const CALORIE_FLOOR = 1400;

const DEFICIT_MIN_WEEKLY_LOSS = -1.0;
const DEFICIT_OK_WEEKLY_LOSS = -0.3;
const LEAN_BULK_MAX_WEEKLY_GAIN = 0.5;
const LEAN_BULK_MIN_WEEKLY_GAIN = 0.0;

const TIGHTEN_DELTA_KCAL = -100;
const RELAX_DELTA_KCAL = 50;
const BULK_INCREASE_DELTA_KCAL = 100;
const BULK_DECREASE_DELTA_KCAL = -50;

export function applyWeeklyTrendline(
  inputs: WeeklyTrendlineInputs,
): WeeklyTrendlineResult {
  const { currentCalorieTarget, targetMode, weeklyWeightDelta, weightDataReliable } = inputs;

  if (!weightDataReliable) {
    return {
      newCalorieTarget: currentCalorieTarget,
      action: 'skipped_menstrual',
      reason: 'weightDataReliable=false (menstrual phase — vage-delta nije pouzdan)',
    };
  }

  if (weeklyWeightDelta === null || !Number.isFinite(weeklyWeightDelta)) {
    return {
      newCalorieTarget: currentCalorieTarget,
      action: 'status_quo',
      reason: 'no_previous_weekly_checkin',
    };
  }

  let deltaKcal = 0;
  let action: WeeklyTrendlineAction = 'status_quo';
  let reason = 'within_expected_range';

  switch (targetMode) {
    case 'deficit': {
      if (weeklyWeightDelta > DEFICIT_OK_WEEKLY_LOSS) {
        deltaKcal = TIGHTEN_DELTA_KCAL;
        action = 'tighten';
        reason = 'deficit_slow_loss';
      } else if (weeklyWeightDelta < DEFICIT_MIN_WEEKLY_LOSS) {
        deltaKcal = RELAX_DELTA_KCAL;
        action = 'relax';
        reason = 'deficit_too_fast';
      }
      break;
    }
    case 'lean_bulk': {
      if (weeklyWeightDelta < LEAN_BULK_MIN_WEEKLY_GAIN) {
        deltaKcal = BULK_INCREASE_DELTA_KCAL;
        action = 'bulk_increase';
        reason = 'lean_bulk_weight_loss';
      } else if (weeklyWeightDelta > LEAN_BULK_MAX_WEEKLY_GAIN) {
        deltaKcal = BULK_DECREASE_DELTA_KCAL;
        action = 'bulk_decrease';
        reason = 'lean_bulk_too_fast';
      }
      break;
    }
    case 'maintenance':
    case 'recomposition': {
      deltaKcal = 0;
      action = 'status_quo';
      reason = 'maintenance_tolerance';
      break;
    }
  }

  const rawTarget = currentCalorieTarget + deltaKcal;
  const clamped = Math.max(CALORIE_FLOOR, Math.round(rawTarget));

  return {
    newCalorieTarget: clamped,
    action,
    reason,
  };
}
