// ============================================================================
// userStatus serialize/deserialize roundtrip tests
// ============================================================================
//
// Najveći rizik baga u JSONB persistenciji je gubitak Date instanci kroz
// JSON.stringify/parse ciklus. Test garantuje da svako Date polje ostaje
// instanceof Date posle round-trip-a.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { _serializeStatus, _deserializeStatus } from './userStatus';
import type { UserStatus } from '@/types/userStatus';

function makeFixtureStatus(): UserStatus {
  const now = new Date('2026-04-19T18:00:00Z');
  const earlier = new Date('2026-04-15T10:30:00Z');

  return {
    clientId: 'test-client-123',
    lastUpdatedAt: now,
    bio: {
      age: 30,
      currentWeightMA5: 65.4,
      weightTrend: 'losing',
      weeklyWeightDelta: -0.3,
      cycleDay: 17,
      cyclePhase: 'luteal',
      weightDataReliable: true,
      recoveryMultiplier: 0.95,
      sleepLast7DaysAvg: 7.2,
      stressLast7DaysAvg: 3,
      hydrationLast7DaysAvgMl: 2200,
    },
    training: {
      activeTemplateId: 'tpl-int-ul-4',
      position: 'intermediate_4',
      daysPerWeek: 4,
      queue: {
        clientId: 'test-client-123',
        mesocycleIndex: 1,
        templateId: 'tpl-int-ul-4',
        sessions: [
          {
            sessionId: 'A1',
            label: 'Lower — Tension',
            dayType: 'Lower',
            partition: 'Lower',
            dayRole: 'Tension',
            status: 'completed',
            scheduledDate: earlier,
            completedAt: earlier,
            actualWorkoutSessionId: 'ws-001',
          },
          {
            sessionId: 'B1',
            label: 'Upper — Heavy',
            dayType: 'Upper',
            partition: 'Upper',
            dayRole: 'Heavy',
            status: 'next',
            scheduledDate: now,
            completedAt: null,
            actualWorkoutSessionId: null,
          },
        ],
        sessionPointer: 1,
        currentMicrocycleIndex: 0,
        swapUsedThisMicrocycle: false,
        partitionLastSeen: {
          Lower: { sessionId: 'A1', date: earlier },
        },
        returnFromBreakCountdown: {},
        createdAt: earlier,
        completedAt: null,
      },
      sessionPointer: 1,
      nextSessionId: 'B1',
      nextSessionPartition: 'Upper',
      partitionLastSeen: {
        Lower: { date: earlier, sessionId: 'A1' },
      },
      isInDeload: false,
      isInReturnFromBreak: false,
      currentMesocycleIndex: 1,
      currentMicrocycleIndex: 0,
      activePauseEvent: null,
    },
    nutrition: {
      bmr: 1450,
      tdee: 2240,
      currentCalorieTarget: 1850,
      targetMode: 'deficit',
      macros: { proteinG: 130, carbsG: 180, fatG: 60 },
      metabolicFilter: ['insulin_resistance'],
      isMetabolicNoiseTriggered: false,
      hydrationTargetMl: 2275,
      hydrationTodayMl: 1500,
      measurementWeekActive: false,
      measurementWeekDay: 0,
      daysSincePlanChange: 4,
      activeRefeedDay: false,
    },
    redFlags: {
      skipCount7d: 1,
      metabolicNoiseDays7d: 0,
      energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 0,
      daysSinceLastWeeklyCheckIn: 3,
      isAtRisk: false,
    },
    clientOverrides: [],
  };
}

describe('userStatus serialize/deserialize', () => {
  it('roundtrip očuva sve scalar vrednosti', () => {
    const original = makeFixtureStatus();
    const serialized = _serializeStatus(original);
    const restored = _deserializeStatus(serialized);

    expect(restored.clientId).toBe(original.clientId);
    expect(restored.bio.recoveryMultiplier).toBe(0.95);
    expect(restored.bio.cyclePhase).toBe('luteal');
    expect(restored.nutrition.currentCalorieTarget).toBe(1850);
    expect(restored.nutrition.macros.proteinG).toBe(130);
    expect(restored.training.position).toBe('intermediate_4');
    expect(restored.training.queue.sessionPointer).toBe(1);
    expect(restored.training.queue.sessions).toHaveLength(2);
  });

  it('roundtrip vraća Date instance, ne string-ove', () => {
    const original = makeFixtureStatus();
    const serialized = _serializeStatus(original);
    const restored = _deserializeStatus(serialized);

    expect(restored.lastUpdatedAt).toBeInstanceOf(Date);
    expect(restored.lastUpdatedAt.getTime()).toBe(original.lastUpdatedAt.getTime());

    expect(restored.training.partitionLastSeen.Lower?.date).toBeInstanceOf(Date);
    expect(restored.training.partitionLastSeen.Lower?.date.getTime())
      .toBe(original.training.partitionLastSeen.Lower!.date.getTime());

    expect(restored.training.queue.createdAt).toBeInstanceOf(Date);
    expect(restored.training.queue.partitionLastSeen.Lower?.date).toBeInstanceOf(Date);
  });

  it('roundtrip konvertuje Date polja u queue.sessions[] (varijabilan array)', () => {
    const original = makeFixtureStatus();
    const serialized = _serializeStatus(original);
    const restored = _deserializeStatus(serialized);

    for (const session of restored.training.queue.sessions) {
      expect(session.scheduledDate).toBeInstanceOf(Date);
      if (session.completedAt !== null) {
        expect(session.completedAt).toBeInstanceOf(Date);
      }
    }

    const completedSession = restored.training.queue.sessions[0];
    expect(completedSession.completedAt?.getTime())
      .toBe(original.training.queue.sessions[0].completedAt!.getTime());
  });

  it('roundtrip ne pravi nove path-ove za null/undefined Date polja', () => {
    const original = makeFixtureStatus();
    original.training.activePauseEvent = null;

    const serialized = _serializeStatus(original);
    const restored = _deserializeStatus(serialized);

    expect(restored.training.activePauseEvent).toBeNull();
  });

  it('roundtrip očuva clientOverrides niz tačno', () => {
    const original = makeFixtureStatus();
    original.clientOverrides = ['hormonal_sync', 'hydration_first'];

    const serialized = _serializeStatus(original);
    const restored = _deserializeStatus(serialized);

    expect(restored.clientOverrides).toEqual(['hormonal_sync', 'hydration_first']);
  });

  it('roundtrip očuva _blockMacroChangesUntil ako je postavljen', () => {
    const original = makeFixtureStatus();
    const blockUntil = new Date('2026-04-20T12:00:00Z');
    original._blockMacroChangesUntil = blockUntil;

    const serialized = _serializeStatus(original);
    const restored = _deserializeStatus(serialized);

    expect(restored._blockMacroChangesUntil).toBeInstanceOf(Date);
    expect(restored._blockMacroChangesUntil?.getTime()).toBe(blockUntil.getTime());
  });
});
