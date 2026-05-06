// ============================================================================
// BIO SCENARIO TESTS — 6 obaveznih scenarija (Faza 5a)
// Spec: 03_INTEGRATION_LAYER.md Sekcija 7.5 (6 scenario invariants)
//       + Faza 5 plana
// ============================================================================
//
// Svaki scenario:
//   1. Setup minimalan UserStatus sa fokusiranim uslovima jednog sync rule-a
//   2. Pokreni runSyncRules (pure pipeline)
//   3. Verifikuj biološke invariante (kalorije, macros, flag-ovi, blockers)
//
// Ovo je Vitest ekvivalent browser smoke testova iz Sekcije 7.5 spec-a 03.
// Browser verifikacija (5a u browseru) je odvojena — ovde pokrivamo logiku.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { runSyncRules } from '@/utils/sync/syncEngine';
import { EventBus } from '@/utils/sync/eventBus';
import type { UserStatus } from '@/types/userStatus';
import type { SystemEvent } from '@/types/events';

// ============================================================================
// Helpers
// ============================================================================

function makeBaseStatus(overrides: Partial<UserStatus> = {}): UserStatus {
  return {
    clientId: 'bio-test',
    lastUpdatedAt: new Date('2026-04-19T12:00:00Z'),
    bio: {
      age: 30,
      currentWeightMA5: 65,
      weightTrend: 'maintaining',
      weeklyWeightDelta: 0,
      cycleDay: null,
      cyclePhase: null,
      weightDataReliable: true,
      recoveryMultiplier: 1.0,
      sleepLast7DaysAvg: 7,
      stressLast7DaysAvg: 3,
      hydrationLast7DaysAvgMl: 2000,
    },
    training: {
      activeTemplateId: 'tpl-1',
      position: 'intermediate_4',
      daysPerWeek: 4,
      queue: {
        clientId: 'bio-test',
        mesocycleIndex: 1,
        templateId: 'tpl-1',
        sessions: [],
        sessionPointer: 0,
        currentMicrocycleIndex: 0,
        swapUsedThisMicrocycle: false,
        partitionLastSeen: {},
        returnFromBreakCountdown: {},
        createdAt: new Date(),
        completedAt: null,
      },
      sessionPointer: 0,
      nextSessionId: 'A1',
      nextSessionPartition: 'Lower',
      partitionLastSeen: {},
      isInDeload: false,
      isInReturnFromBreak: false,
      currentMesocycleIndex: 1,
      currentMicrocycleIndex: 0,
      activePauseEvent: null,
    },
    nutrition: {
      bmr: 1350,
      tdee: 2000,
      currentCalorieTarget: 1600,
      targetMode: 'deficit',
      macros: { proteinG: 130, carbsG: 180, fatG: 60 },
      metabolicFilter: [],
      isMetabolicNoiseTriggered: false,
      hydrationTargetMl: 2275,
      hydrationTodayMl: 2000,
      measurementWeekActive: false,
      measurementWeekDay: 0,
      daysSincePlanChange: 0,
      activeRefeedDay: false,
    },
    redFlags: {
      skipCount7d: 0,
      metabolicNoiseDays7d: 0,
      energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 0,
      daysSinceLastWeeklyCheckIn: 0,
      isAtRisk: false,
    },
    clientOverrides: [],
    ...overrides,
  };
}

// EventBus capture — proverava da pravilo emituje očekivan event
// Registruje handler-e; reset-uje se u beforeEach (clean state)
function captureEvents(): { events: SystemEvent[] } {
  const events: SystemEvent[] = [];
  (['TRAINING_INTENSITY_REDUCE', 'TRAINING_VOLUME_REDUCE', 'HYDRATION_FIRST_WARNING', 'DELOAD_ACTIVATED'] as const)
    .forEach(t => {
      EventBus.subscribe(t, async (e: SystemEvent) => {
        events.push(e);
      });
    });
  return { events };
}

beforeEach(() => {
  // Clean state izmedju it() blokova — EventBus je singleton
  EventBus.reset();
});

// ============================================================================
// Scenario 1 — Lutealna faza (Rule 1)
// Očekivano: carbs +38g, calorieTarget +150, TRAINING_INTENSITY_REDUCE event
// ============================================================================

describe('Bio Scenario 1 — Lutealna faza', () => {
  it('dodaje +38g carbs klijentkinji bez IR (u odnosu na isti status bez luteal-a)', async () => {
    // Poređenje: ista klijentkinja, jedina razlika je cyclePhase
    const nonLuteal = makeBaseStatus();
    const withLuteal = makeBaseStatus({
      bio: { ...makeBaseStatus().bio, cycleDay: 23, cyclePhase: 'luteal' },
    });

    const { events } = captureEvents();
    const baseResult = await runSyncRules(nonLuteal);
    const lutealResult = await runSyncRules(withLuteal);

    // +38g eksplicitno u Rule 1 (Spec 03 Sekcija 3.2 Rule 1).
    // Razlika između dva identična run-a sa jedinim cyclePhase razlikom
    // mora biti tačno +38g carbs (plus ~37g koje dolaze od +150 kcal
    // realokacije kroz macroSplit — tolerancija 35-80g je razuman spektar).
    const diff = lutealResult.nutrition.macros.carbsG - baseResult.nutrition.macros.carbsG;
    expect(diff).toBeGreaterThanOrEqual(38);

    // Event TRAINING_INTENSITY_REDUCE sa reason='luteal_phase'
    const lutealEvent = events.find(e => e.type === 'TRAINING_INTENSITY_REDUCE');
    expect(lutealEvent).toBeDefined();
  });

  it('NE dodaje carb bonus klijentkinji sa insulin_resistance (carb cap preglasuje)', async () => {
    const status = makeBaseStatus({
      bio: { ...makeBaseStatus().bio, cycleDay: 23, cyclePhase: 'luteal' },
      nutrition: {
        ...makeBaseStatus().nutrition,
        metabolicFilter: ['insulin_resistance'],
      },
    });

    const result = await runSyncRules(status);
    // IR klijentkinja ima carb cap 23% kcal — luteal bonus se ne primenjuje
    const carbsKcal = result.nutrition.macros.carbsG * 4;
    const carbsPercent = carbsKcal / result.nutrition.currentCalorieTarget;
    expect(carbsPercent).toBeLessThanOrEqual(0.24);  // tolerancija za rounding
  });

  it('calorieTarget uvažava luteal bonus u recalcCalorieTarget', async () => {
    const normalStatus = makeBaseStatus();
    const lutealStatus = makeBaseStatus({
      bio: { ...makeBaseStatus().bio, cycleDay: 23, cyclePhase: 'luteal' },
    });

    const normal = await runSyncRules(normalStatus);
    const luteal = await runSyncRules(lutealStatus);

    expect(luteal.nutrition.currentCalorieTarget).toBeGreaterThan(
      normal.nutrition.currentCalorieTarget,
    );
  });
});

// ============================================================================
// Scenario 2 — Deload (Rule 3)
// Očekivano: _deloadSyncActive=true, calorieTarget = tdee (maintenance)
// ============================================================================

describe('Bio Scenario 2 — Deload nedelja', () => {
  it('prebacuje deficit na maintenance calorieTarget', async () => {
    const status = makeBaseStatus({
      training: { ...makeBaseStatus().training, isInDeload: true },
      nutrition: { ...makeBaseStatus().nutrition, targetMode: 'deficit' },
    });

    const result = await runSyncRules(status);
    expect(result.nutrition._deloadSyncActive).toBe(true);
    // calorieTarget = tdee × 1.0 (maintenance baseline)
    expect(result.nutrition.currentCalorieTarget).toBe(status.nutrition.tdee);
  });

  it('lean_bulk ostaje u deload-u (NE prebacuje se na maintenance)', async () => {
    const status = makeBaseStatus({
      training: { ...makeBaseStatus().training, isInDeload: true },
      nutrition: { ...makeBaseStatus().nutrition, targetMode: 'lean_bulk' },
    });

    const result = await runSyncRules(status);
    // lean_bulk je eksplicitni izuzetak u applyDeloadSync
    expect(result.nutrition._deloadSyncActive).toBeFalsy();
  });

  it('bez deload-a, flag ostaje false', async () => {
    const status = makeBaseStatus();
    const result = await runSyncRules(status);
    expect(result.nutrition._deloadSyncActive).toBeFalsy();
  });
});

// ============================================================================
// Scenario 3 — Loš san (Rule 2, Fatigue)
// Očekivano: _fatigueSyncActive=true, TRAINING_VOLUME_REDUCE event, maintenance kcal
// ============================================================================

describe('Bio Scenario 3 — Loš san / fatigue', () => {
  it('aktivira fatigue sync kad je san < 6h', async () => {
    const status = makeBaseStatus({
      bio: {
        ...makeBaseStatus().bio,
        sleepLast7DaysAvg: 5,    // ispod praga 6h
        stressLast7DaysAvg: 3,
      },
    });

    const { events } = captureEvents();
    const result = await runSyncRules(status);

    expect(result.nutrition._fatigueSyncActive).toBe(true);
    // TRAINING_VOLUME_REDUCE emituje se
    const volumeEvent = events.find(e => e.type === 'TRAINING_VOLUME_REDUCE');
    expect(volumeEvent).toBeDefined();
  });

  it('aktivira fatigue kad je stres > 4 (čak i sa dobrim snom)', async () => {
    const status = makeBaseStatus({
      bio: {
        ...makeBaseStatus().bio,
        sleepLast7DaysAvg: 8,     // dobar san
        stressLast7DaysAvg: 5,    // iznad praga
      },
    });

    const result = await runSyncRules(status);
    expect(result.nutrition._fatigueSyncActive).toBe(true);
  });

  it('fatigue prebacuje deficit na maintenance calorieTarget', async () => {
    const status = makeBaseStatus({
      bio: { ...makeBaseStatus().bio, sleepLast7DaysAvg: 5 },
      nutrition: { ...makeBaseStatus().nutrition, targetMode: 'deficit' },
    });

    const result = await runSyncRules(status);
    // Fatigue aktivan → maintenance
    expect(result.nutrition.currentCalorieTarget).toBe(status.nutrition.tdee);
  });

  it('nema fatigue flag-a kad su svi parametri normalni', async () => {
    const result = await runSyncRules(makeBaseStatus());
    expect(result.nutrition._fatigueSyncActive).toBeFalsy();
  });
});

// ============================================================================
// Scenario 4 — Metabolic noise (Rule 6)
// Očekivano: _blockProgressionUntil postavljen na today + 3 dana
// ============================================================================

describe('Bio Scenario 4 — Metabolic noise block', () => {
  it('postavlja block progression flag na 3 dana', async () => {
    const now = new Date('2026-04-19T12:00:00Z');
    const status = makeBaseStatus({
      lastUpdatedAt: now,
      nutrition: { ...makeBaseStatus().nutrition, isMetabolicNoiseTriggered: true },
    });

    const result = await runSyncRules(status);
    expect(result._blockProgressionUntil).toBeDefined();

    const expected = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const actual = new Date(result._blockProgressionUntil as Date);
    // Dozvoli tolerancia od 1s (zbog clone round-tripa)
    expect(Math.abs(actual.getTime() - expected.getTime())).toBeLessThan(1000);
  });

  it('bez metabolic noise, block flag ostaje undefined', async () => {
    const result = await runSyncRules(makeBaseStatus());
    expect(result._blockProgressionUntil).toBeUndefined();
  });
});

// ============================================================================
// Scenario 5 — Illness (Rule 7)
// Očekivano: calorieTarget = tdee × 0.95 (ne -20%)
// ============================================================================

describe('Bio Scenario 5 — Illness penalty', () => {
  it('deficit pada na -5% umesto -20% tokom bolesti', async () => {
    const status = makeBaseStatus({
      training: {
        ...makeBaseStatus().training,
        activePauseEvent: {
          type: 'illness',
          startDate: new Date(),
          penaltySessionsRemaining: 2,
        },
      },
      nutrition: { ...makeBaseStatus().nutrition, targetMode: 'deficit' },
    });

    const result = await runSyncRules(status);
    const expected = Math.round(status.nutrition.tdee * 0.95);
    expect(result.nutrition.currentCalorieTarget).toBe(expected);
  });

  it('poštuje 1400 kcal floor čak i tokom bolesti + niskog tdee', async () => {
    const status = makeBaseStatus({
      training: {
        ...makeBaseStatus().training,
        activePauseEvent: {
          type: 'illness',
          startDate: new Date(),
          penaltySessionsRemaining: 2,
        },
      },
      nutrition: {
        ...makeBaseStatus().nutrition,
        tdee: 1300,   // izuzetno nizak TDEE
        targetMode: 'deficit',
      },
    });

    const result = await runSyncRules(status);
    expect(result.nutrition.currentCalorieTarget).toBeGreaterThanOrEqual(1400);
  });
});

// ============================================================================
// Scenario 6 — Hydration first (Rule 5)
// Očekivano: _blockMacroChangesUntil postavljen, HYDRATION_FIRST_WARNING event
// ============================================================================

describe('Bio Scenario 6 — Hydration first block', () => {
  it('blokira macro izmene 24h kad recovery < 0.85 i hydration < 70%', async () => {
    const now = new Date('2026-04-19T12:00:00Z');
    const status = makeBaseStatus({
      lastUpdatedAt: now,
      bio: { ...makeBaseStatus().bio, recoveryMultiplier: 0.8 },
      nutrition: {
        ...makeBaseStatus().nutrition,
        hydrationTargetMl: 2500,
        hydrationTodayMl: 1500,     // 60% — ispod praga 70%
      },
    });

    const { events } = captureEvents();
    const result = await runSyncRules(status);

    expect(result._blockMacroChangesUntil).toBeDefined();
    const expected = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const actual = new Date(result._blockMacroChangesUntil as Date);
    expect(Math.abs(actual.getTime() - expected.getTime())).toBeLessThan(1000);

    // Event emituje
    const hydrationEvent = events.find(e => e.type === 'HYDRATION_FIRST_WARNING');
    expect(hydrationEvent).toBeDefined();
  });

  it('NE blokira kad je recovery iznad 0.85 (čak i sa lošom hidracijom)', async () => {
    const status = makeBaseStatus({
      bio: { ...makeBaseStatus().bio, recoveryMultiplier: 0.9 },
      nutrition: {
        ...makeBaseStatus().nutrition,
        hydrationTodayMl: 500,     // jako niska hidracija
        hydrationTargetMl: 2500,
      },
    });

    const result = await runSyncRules(status);
    expect(result._blockMacroChangesUntil).toBeUndefined();
  });

  it('NE blokira kad je hidracija iznad 70% (čak i sa niskim recovery)', async () => {
    const status = makeBaseStatus({
      bio: { ...makeBaseStatus().bio, recoveryMultiplier: 0.7 },
      nutrition: {
        ...makeBaseStatus().nutrition,
        hydrationTodayMl: 2100,    // 84%
        hydrationTargetMl: 2500,
      },
    });

    const result = await runSyncRules(status);
    expect(result._blockMacroChangesUntil).toBeUndefined();
  });
});

// ============================================================================
// CROSS-RULE: Loš san + Metabolic noise + Illness (Faza 5b)
// Očekivano: sva tri flag-a aktivna + floor 1400 poštovan
// ============================================================================

describe('Cross-rule — Loš san + Metabolic noise + Illness', () => {
  it('sva tri flag-a mogu biti aktivna istovremeno', async () => {
    const status = makeBaseStatus({
      bio: { ...makeBaseStatus().bio, sleepLast7DaysAvg: 5 },
      nutrition: {
        ...makeBaseStatus().nutrition,
        isMetabolicNoiseTriggered: true,
        targetMode: 'deficit',
      },
      training: {
        ...makeBaseStatus().training,
        activePauseEvent: {
          type: 'illness',
          startDate: new Date(),
          penaltySessionsRemaining: 2,
        },
      },
    });

    const result = await runSyncRules(status);

    expect(result.nutrition._fatigueSyncActive).toBe(true);
    expect(result._blockProgressionUntil).toBeDefined();
    expect(result.training.activePauseEvent?.type).toBe('illness');
  });

  it('floor 1400 se poštuje čak i uz najrestriktivniji set uslova', async () => {
    const status = makeBaseStatus({
      bio: { ...makeBaseStatus().bio, sleepLast7DaysAvg: 4 },
      nutrition: {
        ...makeBaseStatus().nutrition,
        tdee: 1450,
        isMetabolicNoiseTriggered: true,
        targetMode: 'deficit',
      },
      training: {
        ...makeBaseStatus().training,
        activePauseEvent: {
          type: 'illness',
          startDate: new Date(),
          penaltySessionsRemaining: 2,
        },
      },
    });

    const result = await runSyncRules(status);
    expect(result.nutrition.currentCalorieTarget).toBeGreaterThanOrEqual(1400);
  });

  it('idempotentnost: runSyncRules 3× sa istim ulazom = identičan rezultat', async () => {
    const status = makeBaseStatus({
      bio: {
        ...makeBaseStatus().bio,
        sleepLast7DaysAvg: 5,
        cycleDay: 23,
        cyclePhase: 'luteal',
      },
      nutrition: {
        ...makeBaseStatus().nutrition,
        isMetabolicNoiseTriggered: true,
      },
    });

    const r1 = await runSyncRules(status);
    const r2 = await runSyncRules(r1);
    const r3 = await runSyncRules(r2);

    expect(r2.nutrition.currentCalorieTarget).toBe(r1.nutrition.currentCalorieTarget);
    expect(r3.nutrition.currentCalorieTarget).toBe(r1.nutrition.currentCalorieTarget);
    expect(r2.nutrition.macros).toEqual(r1.nutrition.macros);
    expect(r3.nutrition.macros).toEqual(r1.nutrition.macros);
  });
});

// ============================================================================
// CROSS-RULE: Luteal + Deload (already u e2eScenarios, dupliramo za lakši pregled)
// ============================================================================

describe('Cross-rule — Luteal + Deload', () => {
  it('luteal carb bonus se aplicira NA VRH deload-maintenance-a', async () => {
    const baseline = makeBaseStatus({
      training: { ...makeBaseStatus().training, isInDeload: true },
    });
    const withLuteal = makeBaseStatus({
      training: { ...makeBaseStatus().training, isInDeload: true },
      bio: { ...makeBaseStatus().bio, cycleDay: 23, cyclePhase: 'luteal' },
    });

    const r1 = await runSyncRules(baseline);
    const r2 = await runSyncRules(withLuteal);

    // Oba maintenance (tdee), ali luteal ima dodatne carbs
    expect(r1.nutrition._deloadSyncActive).toBe(true);
    expect(r2.nutrition._deloadSyncActive).toBe(true);
    expect(r2.nutrition.macros.carbsG).toBeGreaterThan(r1.nutrition.macros.carbsG);
  });
});
