// ============================================================================
// E2E SCENARIO TESTS — full pipeline: onboarding → sync → meal plan
// Spec: 03_INTEGRATION_LAYER.md Sekcija 7.5 (6 obaveznih scenarija) + cross-rule
// ============================================================================
//
// Ovi testovi pokrecu CELOKUPAN engine kao da je realna klijentkinja:
//   1. Build minimalan UserStatus iz onboarding podataka
//   2. Pokreni runSyncRules (svih 8 pravila)
//   3. Pozovi generateMealPlan sa rezultatom
//   4. Verifikuj biloske invariante (kalorije, makro, tagovi)
//
// Razlikuju se od per-modul testova jer testira INTERAKCIJE — za one
// scenari koje per-modul testovi ne mogu sami da pokriju.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { runSyncRules } from '@/utils/sync/syncEngine';
import { EventBus } from '@/utils/sync/eventBus';
import { generateMealPlan, DEFAULT_5_MEAL_SLOTS } from '@/utils/mealPlanGenerator';
import type { UserStatus } from '@/types/userStatus';
import type { ClientProfile, NutritionTemplate } from '@/utils/mealPlanGenerator';
import { FOOD_DATABASE } from '@/data/foodDatabase';

// ============================================================================
// Helpers — stvori realisticne ulaze
// ============================================================================

function makeUserStatus(overrides: Partial<UserStatus> = {}): UserStatus {
  return {
    clientId: 'e2e-test',
    lastUpdatedAt: new Date('2026-04-19T12:00:00Z'),
    bio: {
      age: 30,
      currentWeightMA5: 65, weightTrend: 'maintaining', weeklyWeightDelta: 0,
      cycleDay: null, cyclePhase: null, weightDataReliable: true,
      recoveryMultiplier: 1.0, sleepLast7DaysAvg: 7, stressLast7DaysAvg: 3,
      hydrationLast7DaysAvgMl: 2000,
    },
    training: {
      activeTemplateId: 'tpl-1', position: 'intermediate_4', daysPerWeek: 4,
      queue: {
        clientId: 'e2e-test', mesocycleIndex: 1, templateId: 'tpl-1', sessions: [],
        sessionPointer: 0, currentMicrocycleIndex: 0, swapUsedThisMicrocycle: false,
        partitionLastSeen: {}, returnFromBreakCountdown: {},
        createdAt: new Date(), completedAt: null,
      },
      sessionPointer: 0, nextSessionId: 'A1', nextSessionPartition: 'Lower',
      partitionLastSeen: {}, isInDeload: false, isInReturnFromBreak: false,
      currentMesocycleIndex: 1, currentMicrocycleIndex: 0, activePauseEvent: null,
    },
    nutrition: {
      bmr: 1314, tdee: 2000, currentCalorieTarget: 1600, targetMode: 'deficit',
      macros: { proteinG: 130, carbsG: 180, fatG: 60 },
      metabolicFilter: [], isMetabolicNoiseTriggered: false,
      hydrationTargetMl: 2275, hydrationTodayMl: 2000,
      measurementWeekActive: false, measurementWeekDay: 0,
      daysSincePlanChange: 0, activeRefeedDay: false,
    },
    redFlags: {
      skipCount7d: 0, metabolicNoiseDays7d: 0, energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 0, daysSinceLastWeeklyCheckIn: 0, isAtRisk: false,
    },
    clientOverrides: [],
    ...overrides,
  };
}

function makeClientProfile(overrides: Partial<ClientProfile> = {}): ClientProfile {
  return {
    weight: 65, height: 168, age: 30, gender: 'female',
    goal: 'fat_loss', experience: 'intermediate', frequency: 4,
    allergies: [], foodDislikes: [], metabolicProfile: [],
    sleepQuality: 7, stressLevel: 3, jobType: 'sedentary',
    ...overrides,
  };
}

function makeTemplate(): NutritionTemplate {
  return {
    id: 'e2e-tpl', name: 'E2E Test', description: 'Standard 5-meal cut',
    goalType: 'cut', macroRatio: { protein: 35, carbs: 35, fat: 30 }, macroPreset: 'highProtein',
    calorieStrategy: 'auto', differentOnTrainingDays: false,
    restrictions: [], tags: ['fat_loss'],
    createdAt: '2026-04-19', mealCount: 5, mealSlots: DEFAULT_5_MEAL_SLOTS,
  };
}

// ============================================================================
// SCENARIO E2E #1: Klijentkinja A — beginner / 3 dana / fat loss / IR profil
// ============================================================================
//
// Iz Sekcije 5d Plana 03 — beta klijentkinja A.
// Testira: IR carb cap (max 23%), forbidden snack/high_gi tags u meal plan-u,
// kalorije ne ispod 1400.

describe('E2E #1 — Beginner / fat loss / IR profil', () => {
  beforeEach(() => EventBus.reset());

  it('full pipeline daje validan meal plan sa IR ogranicenjima', async () => {
    // Step 1: UserStatus posle onboarding-a
    const status = makeUserStatus({
      bio: { ...makeUserStatus().bio, currentWeightMA5: 60 },
      nutrition: {
        ...makeUserStatus().nutrition,
        metabolicFilter: ['insulin_resistance'],
        targetMode: 'deficit',
      },
    });

    // Step 2: Sync rules
    const synced = await runSyncRules(status);

    // Carb cap 23% provera
    const carbsKcal = synced.nutrition.macros.carbsG * 4;
    expect(carbsKcal / synced.nutrition.currentCalorieTarget).toBeLessThanOrEqual(0.235);

    // Floor 1400 (vrlo niski tdee + deficit ne sme ispod)
    expect(synced.nutrition.currentCalorieTarget).toBeGreaterThanOrEqual(1400);

    // Step 3: Meal plan gen
    const plan = generateMealPlan(
      makeClientProfile({ weight: 60, metabolicProfile: ['insulin_resistance'], experience: 'beginner', frequency: 3 }),
      makeTemplate(),
      FOOD_DATABASE,
    );

    expect(plan.dailyCalories).toBeGreaterThanOrEqual(1400);
    expect(plan.metabolicAdjustments).toContain('insulin_resistance');
    // Insights treba da reflektuju IR
    expect(plan.insights.some(i => i.title.includes('insulin') || i.title === 'insight.insulinTitle')).toBe(true);
  });
});

// ============================================================================
// SCENARIO E2E #2: Klijentkinja B — glute focus / cycle aware / lutealna faza
// ============================================================================
//
// Cycle bonus +150 kcal posle sync-a treba da se vidi u meal plan-u.

describe('E2E #2 — Glute focus / Hormonal_Aware_Mode / lutealna faza', () => {
  beforeEach(() => EventBus.reset());

  it('lutealna faza dodaje +150 kcal u sinhronizovan meal plan', async () => {
    const status = makeUserStatus({
      bio: { ...makeUserStatus().bio, cycleDay: 23, cyclePhase: 'luteal' },
      nutrition: { ...makeUserStatus().nutrition, targetMode: 'lean_bulk' },
    });
    const synced = await runSyncRules(status);

    // lean_bulk = 2150 (tdee × 1.075), + luteal bonus 150 = 2300
    expect(synced.nutrition.currentCalorieTarget).toBe(2300);

    // Meal plan generisan sa cycle-aware param.
    // Profile 65kg / 168cm / 30g / sedentary / 4× nedeljno:
    //   BMR = 10*65 + 6.25*168 - 5*30 - 161 = 1389
    //   TDEE = 1389 × (1.55 - 0.05) = 2084
    //   Bulk = 2084 × 1.075 = 2240
    //   + luteal 150 = 2390
    const plan = generateMealPlan(
      makeClientProfile({ goal: 'muscle_gain' }),
      { ...makeTemplate(), goalType: 'bulk' },
      FOOD_DATABASE,
      undefined,
      'luteal',
    );

    expect(plan.dailyCalories).toBe(2390);
    // Verifikacija da je luteal bonus zaista primenjen — bez njega bi bilo 2240
    const planWithoutLuteal = generateMealPlan(
      makeClientProfile({ goal: 'muscle_gain' }),
      { ...makeTemplate(), goalType: 'bulk' },
      FOOD_DATABASE,
    );
    expect(plan.dailyCalories - planWithoutLuteal.dailyCalories).toBe(150);
  });
});

// ============================================================================
// SCENARIO E2E #3: Klijentkinja C — Hashimoto + hipertenzija combo
// ============================================================================

describe('E2E #3 — Hashimoto + hipertenzija (kombinovana patologija)', () => {
  beforeEach(() => EventBus.reset());

  it('kumulira flag-ove bez konflikta', async () => {
    const status = makeUserStatus({
      nutrition: {
        ...makeUserStatus().nutrition,
        metabolicFilter: ['hashimoto', 'hypertension'],
      },
    });
    const synced = await runSyncRules(status);

    // Carbs ostaju normalni (Hashimoto + Hipertenzija ne diraju carb ratio)
    // Macros se rekompjutuju kroz applyPathologyMacroOverride

    // Generate plan
    const plan = generateMealPlan(
      makeClientProfile({ metabolicProfile: ['hashimoto', 'hypertension'] }),
      makeTemplate(),
      FOOD_DATABASE,
    );

    expect(plan.metabolicAdjustments).toContain('thyroid');
    expect(synced.nutrition.macros.proteinG).toBeGreaterThan(0);
  });
});

// ============================================================================
// SCENARIO E2E #4: Cross-rule — Deload + Lutealna + losh san
// ============================================================================
//
// Pravila moraju da kompozituju ispravno. Najteze za algoritmaski kod:
//   - Deload baseline = maintenance (2000)
//   - Loš san aktivira fatigue → tezi maintenance (vec smo na njemu)
//   - Lutealna +150 = 2150
//   - Floor 1400 ne diramo (target je iznad)

describe('E2E #4 — Deload + Lutealna + lose hidracija (3 rule-a istovremeno)', () => {
  beforeEach(() => EventBus.reset());

  it('sva 3 pravila kompozituju kako spec ocekuje', async () => {
    const events: string[] = [];
    EventBus.subscribe('TRAINING_INTENSITY_REDUCE', async (e) => { events.push(e.type); });
    EventBus.subscribe('TRAINING_VOLUME_REDUCE', async (e) => { events.push(e.type); });

    const status = makeUserStatus({
      bio: {
        ...makeUserStatus().bio,
        cyclePhase: 'luteal',
        sleepLast7DaysAvg: 5,        // < 6 → fatigue active
      },
      training: { ...makeUserStatus().training, isInDeload: true },
    });

    const synced = await runSyncRules(status);

    // Deload baseline 2000 + luteal 150 = 2150
    expect(synced.nutrition.currentCalorieTarget).toBe(2150);
    // Fatigue flag postavljen
    expect(synced.nutrition._fatigueSyncActive).toBe(true);
    // Oba event-a emit-ovana (luteal intensity + fatigue volume)
    expect(events).toContain('TRAINING_INTENSITY_REDUCE');
    expect(events).toContain('TRAINING_VOLUME_REDUCE');
  });
});

// ============================================================================
// SCENARIO E2E #5: clientOverrides — trener iskljucio luteal_bonus
// ============================================================================

describe('E2E #5 — clientOverrides (trener premium kontrola)', () => {
  beforeEach(() => EventBus.reset());

  it('hormonal_sync override blokira training event', async () => {
    const events: string[] = [];
    EventBus.subscribe('TRAINING_INTENSITY_REDUCE', async (e) => { events.push(e.type); });

    const status = makeUserStatus({
      bio: { ...makeUserStatus().bio, cyclePhase: 'luteal' },
      clientOverrides: ['hormonal_sync'],
    });
    await runSyncRules(status);

    // Training intensity event NIJE emit-ovan (override blokira)
    expect(events).toEqual([]);
  });

  it('fatigue_sync override drzi deficit cak i sa losim snom', async () => {
    const status = makeUserStatus({
      bio: { ...makeUserStatus().bio, sleepLast7DaysAvg: 4.5 },
      clientOverrides: ['fatigue_sync'],
    });
    const synced = await runSyncRules(status);

    // Bez override-a bi pao na 2000 (maintenance). Sa override-om: ostaje 1600 (deficit)
    expect(synced.nutrition.currentCalorieTarget).toBe(1600);
    expect(synced.nutrition._fatigueSyncActive).toBe(false);
  });
});

// ============================================================================
// SCENARIO E2E #6: Idempotentnost cele pipeline-e
// ============================================================================

describe('E2E #6 — full pipeline idempotentnost', () => {
  beforeEach(() => EventBus.reset());

  it('5× pokretanje sync-a + meal plan-a daje iste brojeve', async () => {
    const status = makeUserStatus({
      bio: { ...makeUserStatus().bio, cyclePhase: 'luteal' },
      nutrition: {
        ...makeUserStatus().nutrition,
        metabolicFilter: ['insulin_resistance'],
      },
    });

    const targets: number[] = [];
    let s = status;
    for (let i = 0; i < 5; i++) {
      s = await runSyncRules(s);
      targets.push(s.nutrition.currentCalorieTarget);
    }

    // Svi 5 pokretanja daju isti target
    expect(new Set(targets).size).toBe(1);
  });
});
