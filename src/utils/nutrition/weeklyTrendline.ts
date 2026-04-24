// ============================================================================
// weeklyTrendline — pure adaptive calorie target adjustment (IT-17)
// Spec: 02_NUTRITION_FLOW_MASTER.md §10 (Weekly check-in + trendline)
//       03_INTEGRATION_LAYER.md §3.2 Rule 8 (cycle_menstrual_ignore)
// ============================================================================
//
// Input: trenutni calorie target + targetMode + weekly weight delta (kg/nedelja
//        iz trenutnog vs prethodnog weekly check-in-a) + weightDataReliable
//        flag (false tokom menstrualne nedelje → skip adaptation).
//
// Output: novi calorie target (potencijalno isti kao input), action label za
//         telemetry/UI banner i reason (za audit).
//
// Princip 2 (Sekcija 3.2 Rule 8): ako je weightDataReliable === false
// (menstrualna faza kvari vagu zbog vode), NIKAD ne adaptiramo plan.
// Trendline zahteva pouzdane uzorke; u menstrualnoj fazi vraćamo status-quo.
//
// Adaptation matrica (fat_loss/deficit, lean_bulk, maintenance/recomposition):
//
//   Mode          Očekivano (kg/nedelja)     Akcija
//   ────────────  ─────────────────────────  ─────────────────────────────────
//   deficit       -0.5 do -1.0               status_quo
//   deficit       > -0.3 (slabo gubi)        tighten -100 kcal
//   deficit       < -1.0 (prebrzo)           relax +50 kcal (preveniraj gubi mišića)
//   lean_bulk     +0.2 do +0.4               status_quo
//   lean_bulk     < 0 (gubi težinu)          +100 kcal
//   lean_bulk     > +0.5 (prebrzo)           -50 kcal
//   maintenance   ±0.2                       status_quo (toleriše oscilaciju)
//   recomposition ±0.2                       status_quo (isto kao maintenance)
//
// Biology discipline:
//   - NIKAD ne ide ispod 1400 kcal floor (ako input target je >= 1400, output
//     isto; ako su i +/- delta pomeraji tako mali da ne pređu floor, clamp-uje
//     se na 1400).
//   - Rounding: output kcal je zaokružen na najbliži cio broj.
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
  /** Trenutni calorie target (ulazi kao `nutrition.currentCalorieTarget`). */
  currentCalorieTarget: number;
  /** Mode klijentkinje. */
  targetMode: WeeklyTrendlineMode;
  /**
   * Delta težine (kg) = current weekly weight - prethodni weekly weight.
   * Negativno = gubi, pozitivno = dobija. Ako nema prethodne nedelje (prva
   * weekly check-in), prosledi `null` i funkcija radi status_quo.
   */
  weeklyWeightDelta: number | null;
  /**
   * true = vage-podaci pouzdani (follicular/ovulation/luteal).
   * false = menstrualna faza → skip adaptation.
   */
  weightDataReliable: boolean;
}

export interface WeeklyTrendlineResult {
  /** Novi calorie target (jednako staroj vrednosti ako je action === status_quo). */
  newCalorieTarget: number;
  /** Šta je pravilo uradilo. */
  action: WeeklyTrendlineAction;
  /** Kratki audit razlog (stabilan za logging — ne menjaj za test pokrivenost). */
  reason: string;
}

// Calorie floor je enforced u calorieTarget.ts, ali trendline isto treba da
// poštuje jer se target direktno piše u nutrition.currentCalorieTarget pre
// nego što Sync Engine rekonstruiše.
const CALORIE_FLOOR = 1400;

const DEFICIT_MIN_WEEKLY_LOSS = -1.0;   // kg/nedelja (više = prebrzo)
const DEFICIT_OK_WEEKLY_LOSS = -0.3;    // kg/nedelja (iznad = slabo gubi)
const LEAN_BULK_MAX_WEEKLY_GAIN = 0.5;  // kg/nedelja (više = prebrzo)
const LEAN_BULK_MIN_WEEKLY_GAIN = 0.0;  // kg/nedelja (ispod 0 = gubi)

const TIGHTEN_DELTA_KCAL = -100;
const RELAX_DELTA_KCAL = 50;
const BULK_INCREASE_DELTA_KCAL = 100;
const BULK_DECREASE_DELTA_KCAL = -50;

/**
 * Primeni trendline adaptaciju na calorie target.
 *
 * Pure — nema side-effects; bezbedno za reuse u Edge Function-u (verbatim
 * port u _shared/weeklyTrendline.ts).
 */
export function applyWeeklyTrendline(
  inputs: WeeklyTrendlineInputs,
): WeeklyTrendlineResult {
  const { currentCalorieTarget, targetMode, weeklyWeightDelta, weightDataReliable } = inputs;

  // Rule 8: menstrualna faza → NEVER adaptiraj
  if (!weightDataReliable) {
    return {
      newCalorieTarget: currentCalorieTarget,
      action: 'skipped_menstrual',
      reason: 'weightDataReliable=false (menstrual phase — vage-delta nije pouzdan)',
    };
  }

  // Bez prethodne nedelje — nema delta → status quo
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
        // slabo gubi (< 0.3 kg/nedelja)
        deltaKcal = TIGHTEN_DELTA_KCAL;
        action = 'tighten';
        reason = 'deficit_slow_loss';
      } else if (weeklyWeightDelta < DEFICIT_MIN_WEEKLY_LOSS) {
        // prebrzo gubi (> 1 kg/nedelja) → relax da prevenira gubitak mišića
        deltaKcal = RELAX_DELTA_KCAL;
        action = 'relax';
        reason = 'deficit_too_fast';
      }
      break;
    }
    case 'lean_bulk': {
      if (weeklyWeightDelta < LEAN_BULK_MIN_WEEKLY_GAIN) {
        // gubi težinu umesto da dobija
        deltaKcal = BULK_INCREASE_DELTA_KCAL;
        action = 'bulk_increase';
        reason = 'lean_bulk_weight_loss';
      } else if (weeklyWeightDelta > LEAN_BULK_MAX_WEEKLY_GAIN) {
        // prebrzo dobija (više od 0.5 kg/nedelja)
        deltaKcal = BULK_DECREASE_DELTA_KCAL;
        action = 'bulk_decrease';
        reason = 'lean_bulk_too_fast';
      }
      break;
    }
    case 'maintenance':
    case 'recomposition': {
      // Toleriše ±0.2 kg oscilaciju — ne adaptira
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
