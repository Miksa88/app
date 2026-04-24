// ============================================================================
// weeklyTrendline tests (IT-17)
// ============================================================================

import { describe, it, expect } from 'vitest';

import { applyWeeklyTrendline } from './weeklyTrendline';

describe('applyWeeklyTrendline', () => {
  it('menstrualna faza → skip adaptation (weightDataReliable=false)', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 1800,
      targetMode: 'deficit',
      weeklyWeightDelta: -1.5, // prebrzo, ali menstrualno → ignore
      weightDataReliable: false,
    });

    expect(result.action).toBe('skipped_menstrual');
    expect(result.newCalorieTarget).toBe(1800);
    expect(result.reason).toMatch(/menstrual/i);
  });

  it('deficit, slabo gubi (-0.2 kg/nedelja) → tighten -100 kcal', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 1800,
      targetMode: 'deficit',
      weeklyWeightDelta: -0.2,
      weightDataReliable: true,
    });

    expect(result.action).toBe('tighten');
    expect(result.newCalorieTarget).toBe(1700);
    expect(result.reason).toBe('deficit_slow_loss');
  });

  it('deficit, prebrzo gubi (-1.5 kg/nedelja) → relax +50 kcal', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 1600,
      targetMode: 'deficit',
      weeklyWeightDelta: -1.5,
      weightDataReliable: true,
    });

    expect(result.action).toBe('relax');
    expect(result.newCalorieTarget).toBe(1650);
    expect(result.reason).toBe('deficit_too_fast');
  });

  it('deficit, u očekivanom opsegu (-0.7 kg/nedelja) → status_quo', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 1800,
      targetMode: 'deficit',
      weeklyWeightDelta: -0.7,
      weightDataReliable: true,
    });

    expect(result.action).toBe('status_quo');
    expect(result.newCalorieTarget).toBe(1800);
  });

  it('lean_bulk, gubi težinu (-0.2 kg/nedelja) → +100 kcal', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 2200,
      targetMode: 'lean_bulk',
      weeklyWeightDelta: -0.2,
      weightDataReliable: true,
    });

    expect(result.action).toBe('bulk_increase');
    expect(result.newCalorieTarget).toBe(2300);
    expect(result.reason).toBe('lean_bulk_weight_loss');
  });

  it('lean_bulk, prebrzo dobija (+0.7 kg/nedelja) → -50 kcal', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 2400,
      targetMode: 'lean_bulk',
      weeklyWeightDelta: 0.7,
      weightDataReliable: true,
    });

    expect(result.action).toBe('bulk_decrease');
    expect(result.newCalorieTarget).toBe(2350);
    expect(result.reason).toBe('lean_bulk_too_fast');
  });

  it('maintenance, ±0.1 kg oscilacija → status_quo', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 2000,
      targetMode: 'maintenance',
      weeklyWeightDelta: 0.1,
      weightDataReliable: true,
    });

    expect(result.action).toBe('status_quo');
    expect(result.newCalorieTarget).toBe(2000);
  });

  it('prva weekly check-in (weeklyWeightDelta=null) → status_quo', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 1800,
      targetMode: 'deficit',
      weeklyWeightDelta: null,
      weightDataReliable: true,
    });

    expect(result.action).toBe('status_quo');
    expect(result.newCalorieTarget).toBe(1800);
    expect(result.reason).toBe('no_previous_weekly_checkin');
  });

  it('calorie floor — tighten ne sme ispod 1400 kcal', () => {
    const result = applyWeeklyTrendline({
      currentCalorieTarget: 1450,
      targetMode: 'deficit',
      weeklyWeightDelta: -0.1, // slabo gubi → tighten -100
      weightDataReliable: true,
    });

    expect(result.action).toBe('tighten');
    expect(result.newCalorieTarget).toBe(1400); // floor clamp
  });
});
