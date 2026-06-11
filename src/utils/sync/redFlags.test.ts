import { describe, it, expect } from 'vitest';
import { calcRedFlags, decayRollingCounters } from './redFlags';
import type { UserStatus, UserStatusRedFlags } from '@/types/userStatus';

function makeStatus(redFlags: Partial<UserStatusRedFlags> = {}): UserStatus {
  return {
    clientId: 't',
    lastUpdatedAt: new Date(),
    bio: {
      age: 30,
      currentWeightMA5: 65, weightTrend: 'maintaining', weeklyWeightDelta: 0,
      cycleDay: null, cyclePhase: null, weightDataReliable: true,
      recoveryMultiplier: 1.0, sleepLast7DaysAvg: 7, stressLast7DaysAvg: 3,
      hydrationLast7DaysAvgMl: 2000,
    },
    training: {
      activeTemplateId: 't', position: 'beginner_3', daysPerWeek: 3, queue: {
        clientId: 't', mesocycleIndex: 1, templateId: 't', sessions: [],
        sessionPointer: 0, currentMicrocycleIndex: 0, swapUsedThisMicrocycle: false,
        partitionLastSeen: {}, returnFromBreakCountdown: {},
        createdAt: new Date(), completedAt: null,
      },
      sessionPointer: 0, nextSessionId: '', nextSessionPartition: 'FullBody',
      partitionLastSeen: {}, isInDeload: false, isInReturnFromBreak: false,
      currentMesocycleIndex: 1, currentMicrocycleIndex: 0, activePauseEvent: null,
      dietBreakActive: false, dietBreakStartedAt: null, mesocyclesSinceDietBreak: 0,
    },
    nutrition: {
      bmr: 1400, tdee: 2000, currentCalorieTarget: 1600, targetMode: 'deficit',
      macros: { proteinG: 130, carbsG: 180, fatG: 60 },
      metabolicFilter: [], isMetabolicNoiseTriggered: false,
      hydrationTargetMl: 2275, hydrationTodayMl: 1500,
      measurementWeekActive: false, measurementWeekDay: 0,
      daysSincePlanChange: 0, currentSmartCutStep: 0, activeRefeedDay: false,
    },
    redFlags: {
      skipCount7d: 0, metabolicNoiseDays7d: 0, energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 0, daysSinceLastWeeklyCheckIn: 0, isAtRisk: false,
      ...redFlags,
    },
    clientOverrides: [],
  };
}

describe('calcRedFlags — at risk triggers', () => {
  it('skipCount > 3 → at risk', () => {
    const status = makeStatus({ skipCount7d: 3 });
    const result = calcRedFlags({ status, incrementSkipCount: 1 });
    expect(result.skipCount7d).toBe(4);
    expect(result.isAtRisk).toBe(true);
  });

  it('metabolic noise 2+ dana → at risk', () => {
    const status = makeStatus({ metabolicNoiseDays7d: 1 });
    const result = calcRedFlags({ status, incrementMetabolicNoiseDays: 1 });
    expect(result.metabolicNoiseDays7d).toBe(2);
    expect(result.isAtRisk).toBe(true);
  });

  it('energy below 5 — 3+ dana → at risk', () => {
    const status = makeStatus({ energyBelowThreshold7d: 2 });
    const result = calcRedFlags({ status, incrementEnergyBelowDays: 1 });
    expect(result.energyBelowThreshold7d).toBe(3);
    expect(result.isAtRisk).toBe(true);
  });

  it('2 uzastopna failovana treninga → at risk', () => {
    const status = makeStatus({ consecutiveFailedWorkouts: 1 });
    const result = calcRedFlags({ status, incrementConsecutiveFailedWorkouts: 1 });
    expect(result.consecutiveFailedWorkouts).toBe(2);
    expect(result.isAtRisk).toBe(true);
  });

  it('uspesan trening resetuje failed counter', () => {
    const status = makeStatus({ consecutiveFailedWorkouts: 2 });
    const result = calcRedFlags({ status, resetFailedWorkouts: true });
    expect(result.consecutiveFailedWorkouts).toBe(0);
  });

  it('weekly checkin completion resetuje counter', () => {
    const status = makeStatus({ daysSinceLastWeeklyCheckIn: 8 });
    const result = calcRedFlags({ status, weeklyCheckInJustCompleted: true });
    expect(result.daysSinceLastWeeklyCheckIn).toBe(0);
  });

  it('zdrava klijentkinja → NIJE at risk', () => {
    const status = makeStatus();
    const result = calcRedFlags({ status });
    expect(result.isAtRisk).toBe(false);
  });
});

describe('decayRollingCounters', () => {
  it('linearno smanjuje 7-day brojace', () => {
    const flags: UserStatusRedFlags = {
      skipCount7d: 7, metabolicNoiseDays7d: 0, energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 0, daysSinceLastWeeklyCheckIn: 0, isAtRisk: false,
    };
    const result = decayRollingCounters(flags, 1);
    expect(result.skipCount7d).toBeLessThan(7);
  });

  it('NE smanjuje consecutiveFailedWorkouts (to nije rolling)', () => {
    const flags: UserStatusRedFlags = {
      skipCount7d: 0, metabolicNoiseDays7d: 0, energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 3, daysSinceLastWeeklyCheckIn: 0, isAtRisk: false,
    };
    const result = decayRollingCounters(flags, 1);
    expect(result.consecutiveFailedWorkouts).toBe(3);
  });
});
