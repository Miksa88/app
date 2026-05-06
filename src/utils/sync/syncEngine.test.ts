import { describe, it, expect, beforeEach } from 'vitest';
import { runSyncRules } from './syncEngine';
import { assertIdempotent } from './idempotencyGuard';
import { EventBus } from './eventBus';
import type { UserStatus } from '@/types/userStatus';
import type { SystemEvent } from '@/types/events';

// ============================================================================
// Test fixture — minimalan UserStatus za scenario testove
// ============================================================================

function makeStatus(overrides: Partial<UserStatus> = {}): UserStatus {
  return {
    clientId: 't',
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
        clientId: 't', mesocycleIndex: 1, templateId: 'tpl-1', sessions: [],
        sessionPointer: 0, currentMicrocycleIndex: 0, swapUsedThisMicrocycle: false,
        partitionLastSeen: {}, returnFromBreakCountdown: {},
        createdAt: new Date(), completedAt: null,
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
      bmr: 1400,
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
      skipCount7d: 0, metabolicNoiseDays7d: 0, energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 0, daysSinceLastWeeklyCheckIn: 0, isAtRisk: false,
    },
    clientOverrides: [],
    ...overrides,
  };
}

// ============================================================================
// SCENARIO 1 — Lutealna faza (Spec 03 Sekcija 7.5 scenario 1)
// ============================================================================

describe('SCENARIO 1: Lutealna faza (cycle day 23)', () => {
  beforeEach(() => EventBus.reset());

  it('+150 kcal target + EKSPLICITNO +38g carbs + training intensity event', async () => {
    const events: SystemEvent[] = [];
    EventBus.subscribe('TRAINING_INTENSITY_REDUCE', async (e) => { events.push(e); });

    const baseline = makeStatus();
    const baselineResult = await runSyncRules(baseline);
    const baselineCarbs = baselineResult.nutrition.macros.carbsG;

    // Sad sa luteal phase
    const status = makeStatus({
      bio: { ...makeStatus().bio, cycleDay: 23, cyclePhase: 'luteal' },
    });
    const result = await runSyncRules(status);

    // Calorie target = deficit (2000*0.80 = 1600) + luteal (+150) = 1750
    expect(result.nutrition.currentCalorieTarget).toBe(1750);

    // EKSPLICITAN +38g carbs override (Spec 03 Rule 1 strict)
    // Razlika izmedju baseline carbs i luteal carbs >= 38g
    // (38 eksplicitnog + nesto malo iz prirodne raspodele +150 kcal)
    expect(result.nutrition.macros.carbsG - baselineCarbs).toBeGreaterThanOrEqual(38);

    // Training intensity reduce event emit
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'TRAINING_INTENSITY_REDUCE',
      reason: 'luteal_phase',
      reduction: 0.05,
    });
  });

  it('IR safeguard — luteal carb bonus se NE primenjuje ako klijentkinja ima IR', async () => {
    // Baseline IR (bez luteal): carbs cap na 23% kcal
    const baselineIR = await runSyncRules(makeStatus({
      nutrition: { ...makeStatus().nutrition, metabolicFilter: ['insulin_resistance'] },
    }));
    const baselineCarbs = baselineIR.nutrition.macros.carbsG;

    // IR + luteal: target i dalje raste +150 kcal, ali eksplicitnih +38g NEMA
    const lutealIR = await runSyncRules(makeStatus({
      bio: { ...makeStatus().bio, cyclePhase: 'luteal' },
      nutrition: { ...makeStatus().nutrition, metabolicFilter: ['insulin_resistance'] },
    }));

    // Carbs ostaju u IR cap-u (ne dobija +38g eksplicitno)
    // Razlika je samo prirodna kroz +150 kcal preraspodelu (pretezno fat zbog cap-a)
    const carbDelta = lutealIR.nutrition.macros.carbsG - baselineCarbs;
    expect(carbDelta).toBeLessThan(38);
  });

  it('clientOverrides isključuje hormonal_sync — bonus se NE primenjuje', async () => {
    const events: SystemEvent[] = [];
    EventBus.subscribe('TRAINING_INTENSITY_REDUCE', async (e) => { events.push(e); });

    const status = makeStatus({
      bio: { ...makeStatus().bio, cycleDay: 23, cyclePhase: 'luteal' },
      clientOverrides: ['hormonal_sync'],
    });
    const result = await runSyncRules(status);

    // Event NIJE emit-ovan
    expect(events).toHaveLength(0);
    // Calorie target i dalje dobija +150 kroz recalcCalorieTarget jer ono
    // gleda direktno cyclePhase. Override blokira samo event/intensity reduce.
    // (Buduca verzija moze dodati i flag za blokadu calorie bonus-a — za
    // sad spec 03 Rule 1 vise blokira training side, manje nutrition)
    expect(result.nutrition.currentCalorieTarget).toBe(1750);
  });
});

// ============================================================================
// SCENARIO 2 — Loš san (Spec 03 Sekcija 7.5 scenario 3)
// ============================================================================

describe('SCENARIO 2: Loš san 3 dana zaredom (< 6h)', () => {
  beforeEach(() => EventBus.reset());

  it('training volume reduce event + nutrition na maintenance', async () => {
    const events: SystemEvent[] = [];
    EventBus.subscribe('TRAINING_VOLUME_REDUCE', async (e) => { events.push(e); });

    const status = makeStatus({
      bio: { ...makeStatus().bio, sleepLast7DaysAvg: 5.5 },
    });
    const result = await runSyncRules(status);

    // Volume reduce event
    expect(events[0]).toMatchObject({
      type: 'TRAINING_VOLUME_REDUCE',
      reason: 'low_recovery',
      reduction: 0.15,
    });

    // Nutrition na maintenance (deficit 1600 → 2000)
    expect(result.nutrition.currentCalorieTarget).toBe(2000);
    expect(result.nutrition._fatigueSyncActive).toBe(true);
  });
});

// ============================================================================
// SCENARIO 3 — Deload (Spec 03 Sekcija 7.5 scenario 2)
// ============================================================================

describe('SCENARIO 3: Deload aktivan', () => {
  beforeEach(() => EventBus.reset());

  it('deficit pada na maintenance (2000 kcal)', async () => {
    const status = makeStatus({
      training: { ...makeStatus().training, isInDeload: true },
    });
    const result = await runSyncRules(status);
    expect(result.nutrition.currentCalorieTarget).toBe(2000);
  });

  it('lean_bulk OSTAJE — klijentkinja na bulk-u i u deload-u treba kcal', async () => {
    const status = makeStatus({
      training: { ...makeStatus().training, isInDeload: true },
      nutrition: { ...makeStatus().nutrition, targetMode: 'lean_bulk' },
    });
    const result = await runSyncRules(status);
    expect(result.nutrition.currentCalorieTarget).toBe(2150);  // tdee × 1.075
  });
});

// ============================================================================
// SCENARIO 4 — Metabolic noise (Spec 03 Sekcija 7.5 scenario 4)
// ============================================================================

describe('SCENARIO 4: Metabolic noise triggered (tečne kcal > 10%)', () => {
  beforeEach(() => EventBus.reset());

  it('blokira plan adjustment 3 dana', async () => {
    const status = makeStatus({
      nutrition: { ...makeStatus().nutrition, isMetabolicNoiseTriggered: true },
    });
    const result = await runSyncRules(status);

    expect(result._blockProgressionUntil).toBeDefined();
    const blockMs = result._blockProgressionUntil!.getTime() - status.lastUpdatedAt.getTime();
    expect(blockMs).toBe(3 * 24 * 60 * 60 * 1000);
  });
});

// ============================================================================
// SCENARIO 5 — Illness (Spec 03 Sekcija 7.5 scenario 5)
// ============================================================================

describe('SCENARIO 5: Pause illness aktivna', () => {
  beforeEach(() => EventBus.reset());

  it('deficit pada na -5% (1900 kcal), ne -20%', async () => {
    const status = makeStatus({
      training: {
        ...makeStatus().training,
        activePauseEvent: {
          type: 'illness',
          startDate: new Date('2026-04-15T00:00:00Z'),
          penaltySessionsRemaining: 2,
        },
      },
    });
    const result = await runSyncRules(status);
    expect(result.nutrition.currentCalorieTarget).toBe(1900);  // 2000 × 0.95
  });

  it('travel pause — nutrition OSTAJE u standardnom deficit-u', async () => {
    const status = makeStatus({
      training: {
        ...makeStatus().training,
        activePauseEvent: {
          type: 'travel',
          startDate: new Date('2026-04-15T00:00:00Z'),
          penaltySessionsRemaining: 0,
        },
      },
    });
    const result = await runSyncRules(status);
    expect(result.nutrition.currentCalorieTarget).toBe(1600);  // tdee × 0.80, normal
  });
});

// ============================================================================
// SCENARIO 6 — Hydration first (Spec 03 Sekcija 7.5 scenario 6)
// ============================================================================

describe('SCENARIO 6: Hydration first warning', () => {
  beforeEach(() => EventBus.reset());

  it('recovery < 0.85 + hydration < 70% → warning event + block 24h', async () => {
    const events: SystemEvent[] = [];
    EventBus.subscribe('HYDRATION_FIRST_WARNING', async (e) => { events.push(e); });

    const status = makeStatus({
      bio: { ...makeStatus().bio, recoveryMultiplier: 0.80 },
      nutrition: {
        ...makeStatus().nutrition,
        hydrationTargetMl: 2000,
        hydrationTodayMl: 1000,  // 50% < 70%
      },
    });
    const result = await runSyncRules(status);

    expect(events).toHaveLength(1);
    expect(result._blockMacroChangesUntil).toBeDefined();
    const blockMs = result._blockMacroChangesUntil!.getTime() - status.lastUpdatedAt.getTime();
    expect(blockMs).toBe(24 * 60 * 60 * 1000);
  });

  it('dovoljna hidracija → NEMA warning-a', async () => {
    const events: SystemEvent[] = [];
    EventBus.subscribe('HYDRATION_FIRST_WARNING', async (e) => { events.push(e); });

    const status = makeStatus({
      bio: { ...makeStatus().bio, recoveryMultiplier: 0.80 },
      nutrition: {
        ...makeStatus().nutrition,
        hydrationTargetMl: 2000,
        hydrationTodayMl: 1500,  // 75% > 70%
      },
    });
    await runSyncRules(status);
    expect(events).toHaveLength(0);
  });
});

// ============================================================================
// CROSS-RULE INTERACTIONS
// ============================================================================

describe('Cross-rule: Luteal + Deload', () => {
  beforeEach(() => EventBus.reset());

  it('Luteal bonus se dodaje NA VRH deload baseline-a', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, cyclePhase: 'luteal' },
      training: { ...makeStatus().training, isInDeload: true },
    });
    const result = await runSyncRules(status);
    // Deload baseline = 2000 (maintenance), luteal +150 = 2150
    expect(result.nutrition.currentCalorieTarget).toBe(2150);
  });
});

describe('Cross-rule: menstrual phase weight unreliable', () => {
  beforeEach(() => EventBus.reset());

  it('cyclePhase=menstrual → weightDataReliable=false', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, cycleDay: 2, cyclePhase: 'menstrual' },
    });
    const result = await runSyncRules(status);
    expect(result.bio.weightDataReliable).toBe(false);
  });
});

// ============================================================================
// IDEMPOTENTNOST — KRITIČAN test
// ============================================================================

describe('runSyncRules — IDEMPOTENT (Spec 03 Sekcija 3.3)', () => {
  beforeEach(() => EventBus.reset());

  it('zdrava klijentkinja — 3× isti rezultat', async () => {
    const status = makeStatus();
    const result = await assertIdempotent(status, 3);
    expect(result.isIdempotent).toBe(true);
  });

  it('lutealna faza — 3× isti calorie target', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, cyclePhase: 'luteal' },
    });
    const result = await assertIdempotent(status, 3);
    expect(result.isIdempotent).toBe(true);
    if (!result.isIdempotent) console.log(result.diffs);
  });

  it('multi-rule scenario (deload + luteal + IR) — i dalje idempotent', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, cyclePhase: 'luteal' },
      training: { ...makeStatus().training, isInDeload: true },
      nutrition: { ...makeStatus().nutrition, metabolicFilter: ['insulin_resistance'] },
    });
    const result = await assertIdempotent(status, 5);
    expect(result.isIdempotent).toBe(true);
    if (!result.isIdempotent) console.log(result.diffs);
  });

  // ──────────────────────────────────────────────────────────────────────
  // Idempotency po pravilu — Plan Faza 2: "za svaku Sync Rule, unit test
  // koji pokrece runSyncRules 3 puta sa istim ulazom"
  // ──────────────────────────────────────────────────────────────────────

  it('Rule 2 Fatigue sync — 3× isti rezultat', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, sleepLast7DaysAvg: 5 },
    });
    const result = await assertIdempotent(status, 3);
    expect(result.isIdempotent).toBe(true);
    if (!result.isIdempotent) console.log(result.diffs);
  });

  it('Rule 4 Return from Break — 3× isti rezultat', async () => {
    const status = makeStatus({
      training: { ...makeStatus().training, isInReturnFromBreak: true },
    });
    const result = await assertIdempotent(status, 3);
    expect(result.isIdempotent).toBe(true);
    if (!result.isIdempotent) console.log(result.diffs);
  });

  it('Rule 5 Hydration first — 3× isti rezultat', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, recoveryMultiplier: 0.80 },
      nutrition: {
        ...makeStatus().nutrition,
        hydrationTargetMl: 2000, hydrationTodayMl: 1000,
      },
    });
    const result = await assertIdempotent(status, 3);
    expect(result.isIdempotent).toBe(true);
    if (!result.isIdempotent) console.log(result.diffs);
  });

  it('Rule 7 Illness penalty — 3× isti rezultat', async () => {
    const status = makeStatus({
      training: {
        ...makeStatus().training,
        activePauseEvent: {
          type: 'illness',
          startDate: new Date('2026-04-15T00:00:00Z'),
          penaltySessionsRemaining: 2,
        },
      },
    });
    const result = await assertIdempotent(status, 3);
    expect(result.isIdempotent).toBe(true);
    if (!result.isIdempotent) console.log(result.diffs);
  });

  it('Rule 8 Cycle menstrual — 3× isti rezultat', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, cycleDay: 2, cyclePhase: 'menstrual' },
    });
    const result = await assertIdempotent(status, 3);
    expect(result.isIdempotent).toBe(true);
    if (!result.isIdempotent) console.log(result.diffs);
  });

  it('NIKAD ne akumulira luteal bonus kroz 5 poziva', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, cyclePhase: 'luteal' },
    });
    const targets: number[] = [];
    let s = status;
    for (let i = 0; i < 5; i++) {
      s = await runSyncRules(s);
      targets.push(s.nutrition.currentCalorieTarget);
    }
    expect(new Set(targets).size).toBe(1);
    expect(targets[0]).toBe(1750);  // ne 1900, ne 2050, ne 2200
  });
});

// ============================================================================
// MACRO RECOMPUTATION — proveri da je pathology override aktivan
// ============================================================================

describe('Macro split posle sync-a', () => {
  beforeEach(() => EventBus.reset());

  it('IR profil — carbs cap 23% kcal aplikovan', async () => {
    const status = makeStatus({
      nutrition: { ...makeStatus().nutrition, metabolicFilter: ['insulin_resistance'] },
    });
    const result = await runSyncRules(status);
    // Carbs ne smeju biti vise od 23% × 1600 = 368 kcal = 92g
    const carbsKcal = result.nutrition.macros.carbsG * 4;
    expect(carbsKcal / result.nutrition.currentCalorieTarget).toBeLessThanOrEqual(0.235);
  });

  it('protein je vrtoglavo 2.0g/kg', async () => {
    const status = makeStatus({
      bio: { ...makeStatus().bio, currentWeightMA5: 70 },
    });
    const result = await runSyncRules(status);
    expect(result.nutrition.macros.proteinG).toBe(140);  // 70 × 2.0
  });
});
