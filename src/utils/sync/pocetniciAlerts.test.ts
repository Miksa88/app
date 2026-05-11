import { describe, it, expect } from 'vitest';
import { detectPocetniciAlerts, countLowSleepNights7d } from './pocetniciAlerts';
import type { UserStatus } from '@/types/userStatus';

function makeStatus(): UserStatus {
  return {
    clientId: 'c1',
    lastUpdatedAt: new Date(),
    bio: {} as UserStatus['bio'],
    training: {} as UserStatus['training'],
    nutrition: {} as UserStatus['nutrition'],
    redFlags: {
      skipCount7d: 0,
      metabolicNoiseDays7d: 0,
      energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 0,
      daysSinceLastWeeklyCheckIn: 0,
      isAtRisk: false,
    },
    clientOverrides: [],
  };
}

describe('detectPocetniciAlerts — pocetnici.md §8', () => {
  it('Cycle missed >7 dana → red alert sa STOP Overreach', () => {
    const alerts = detectPocetniciAlerts({
      status: makeStatus(),
      cycleMissedDaysPastExpected: 8,
    });
    expect(alerts.find(a => a.id === 'cycle_missed')?.severity).toBe('red');
    expect(alerts.find(a => a.id === 'cycle_missed')?.recommendedActions.some(s => s.includes('Overreach'))).toBe(true);
  });

  it('2+ failed sessions → strength_drop red', () => {
    const status = makeStatus();
    status.redFlags.consecutiveFailedWorkouts = 2;
    const alerts = detectPocetniciAlerts({ status });
    expect(alerts.find(a => a.id === 'strength_drop')?.severity).toBe('red');
  });

  it('3+ noći < 6h → poor_sleep amber sa Mg suplement preporukom', () => {
    const alerts = detectPocetniciAlerts({
      status: makeStatus(),
      lowSleepNightsLast7Days: 3,
    });
    const sleep = alerts.find(a => a.id === 'poor_sleep');
    expect(sleep?.severity).toBe('amber');
    expect(sleep?.recommendedActions.some(s => s.includes('Magnesium'))).toBe(true);
  });

  it('3+ meal breaches → amber sa +10% kcal preporukom', () => {
    const status = makeStatus();
    status.redFlags.skipCount7d = 4;
    const alerts = detectPocetniciAlerts({ status });
    expect(alerts.find(a => a.id === 'meal_breaches')?.severity).toBe('amber');
  });

  it('Self-reported exhaustion → red, traži razgovor', () => {
    const alerts = detectPocetniciAlerts({
      status: makeStatus(),
      selfReportedExhaustion: true,
    });
    expect(alerts.find(a => a.id === 'self_exhaustion')?.severity).toBe('red');
  });

  it('Bez signala → prazna lista', () => {
    const alerts = detectPocetniciAlerts({ status: makeStatus() });
    expect(alerts).toEqual([]);
  });

  it('Više simultanih signala → svi vraćeni', () => {
    const status = makeStatus();
    status.redFlags.consecutiveFailedWorkouts = 2;
    status.redFlags.skipCount7d = 4;
    const alerts = detectPocetniciAlerts({
      status,
      lowSleepNightsLast7Days: 4,
      cycleMissedDaysPastExpected: 10,
    });
    expect(alerts.length).toBe(4);
  });
});

describe('countLowSleepNights7d', () => {
  it('Broji samo noći < 6h sa ne-null vrednošću', () => {
    expect(countLowSleepNights7d([
      { date: 'd1', sleepHours: 5.5 },
      { date: 'd2', sleepHours: 8 },
      { date: 'd3', sleepHours: null },
      { date: 'd4', sleepHours: 4 },
    ])).toBe(2);
  });
});
