// ============================================================================
// useLogMeal — tests za runLogMeal orchestrator
// ============================================================================
//
// Testiramo `runLogMeal` orchestrator direktno (bez renderHook), isti pattern
// kao useDailyCheckIn.test.ts i useFinishWorkout.test.ts. Pokriva 3 slučaja:
//
//   1. Happy path — EF vraća newStatus sa isMetabolicNoiseTriggered=true, hook
//      poziva applyRules (runSyncRules mock) i invokeSaveUserStatus sa
//      sync-derived status-om. Verifikujemo da je save pozvan sa syncedStatus
//      (npr. `_blockProgressionUntil` koji bi Rule 6 postavio).
//
//   2. EF error — `invokeProcessMealLog` throw-a, mutation throw-a; applyRules
//      i invokeSaveUserStatus NISU pozvani (fail-fast).
//
//   3. Skip meal — payload sa status='skipped' i svim makroima=0 prolazi kroz
//      orchestrator. EF vraća status sa incrementnuti skipCount7d; hook ne
//      menja payload (verifikujemo call args).
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

import { runLogMeal } from "./useLogMeal";
import type {
  LogMealDeps,
  MealLogPayload,
  ProcessMealLogResponse,
} from "./useLogMeal";
import type { UserStatus } from "@/types/userStatus";

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

function makeStatus(overrides: Partial<UserStatus> = {}): UserStatus {
  return {
    clientId: "client-a",
    lastUpdatedAt: new Date("2026-04-24T10:00:00Z"),
    bio: {
      age: 30,
      currentWeightMA5: 60.2,
      weightTrend: "maintaining",
      weeklyWeightDelta: 0,
      cycleDay: null,
      cyclePhase: null,
      weightDataReliable: true,
      recoveryMultiplier: 1.0,
      sleepLast7DaysAvg: 7.5,
      stressLast7DaysAvg: 3,
      hydrationLast7DaysAvgMl: 2100,
    },
    training: {
      activeTemplateId: "",
      position: "beginner_3",
      daysPerWeek: 3,
      queue: {
        clientId: "client-a",
        mesocycleIndex: 1,
        templateId: "",
        sessions: [],
        sessionPointer: 0,
        currentMicrocycleIndex: 0,
        swapUsedThisMicrocycle: false,
        partitionLastSeen: {},
        returnFromBreakCountdown: {},
        createdAt: new Date("2026-04-01T00:00:00Z"),
        completedAt: null,
      },
      sessionPointer: 0,
      nextSessionId: "",
      nextSessionPartition: "FullBody",
      partitionLastSeen: {},
      isInDeload: false,
      isInReturnFromBreak: false,
      currentMesocycleIndex: 1,
      currentMicrocycleIndex: 0,
      dietBreakActive: false,
      dietBreakStartedAt: null,
      mesocyclesSinceDietBreak: 0,
      activePauseEvent: null,
    },
    nutrition: {
      bmr: 1400,
      tdee: 2000,
      currentCalorieTarget: 1800,
      targetMode: "maintenance",
      macros: { proteinG: 130, carbsG: 180, fatG: 60 },
      metabolicFilter: [],
      isMetabolicNoiseTriggered: false,
      hydrationTargetMl: 2100,
      hydrationTodayMl: 1000,
      measurementWeekActive: false,
      measurementWeekDay: 0,
      daysSincePlanChange: 0,
      currentSmartCutStep: 0,
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

function makePayload(overrides: Partial<MealLogPayload> = {}): MealLogPayload {
  return {
    clientId: "client-a",
    mealId: "meal_breakfast_001",
    slotIndex: 0,
    status: "logged",
    calories: 450,
    protein: 30,
    carbs: 50,
    fat: 12,
    wasLiquidCalories: false,
    replacementMealId: null,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<LogMealDeps> = {}): LogMealDeps {
  const defaultEfResponse: ProcessMealLogResponse = {
    ok: true,
    // EF vraća status objekt — serialize-uje Date kroz JSON u EF handleru, pa
    // hook deserialize-uje. Mi ovde mock-ujemo već deserijalizovan (Date objekti),
    // i `_deserializeStatus` će naš mock status `JSON.stringify/parse`-ovati
    // pa konvertovati nazad u Date — output je funkcionalno isti objekat.
    status: makeStatus({
      nutrition: {
        ...makeStatus().nutrition,
        isMetabolicNoiseTriggered: true, // EF je trigger-ovao noise (>10% liquid)
      },
    }),
    liquidTotal: 600,
    isMetabolicNoiseTriggered: true,
  };

  return {
    invokeProcessMealLog: vi.fn(async () => defaultEfResponse),
    invokeSaveUserStatus: vi.fn(async () => {
      /* noop */
    }),
    // Mock runSyncRules — pure transformer, ovde prosto klonira i markira
    // `_blockProgressionUntil` kad je `isMetabolicNoiseTriggered=true` (Rule 6).
    // Pravi syncEngine.runSyncRules je pokriven u syncEngine.test.ts.
    applyRules: vi.fn(async (status: UserStatus) => {
      if (status.nutrition.isMetabolicNoiseTriggered) {
        return {
          ...status,
          _blockProgressionUntil: new Date("2026-04-27T10:00:00Z"),
        };
      }
      return status;
    }),
    ...overrides,
  };
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("runLogMeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path — EF vraća noise-triggered status, applyRules postavlja block, save dobija sync-derived status", async () => {
    const deps = makeDeps();
    const result = await runLogMeal(makePayload(), deps);

    // 1. EF pozvan tačno jednom sa ispravnim payloadom
    expect(deps.invokeProcessMealLog).toHaveBeenCalledTimes(1);
    const efCall = (deps.invokeProcessMealLog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(efCall.status).toBe("logged");
    expect(efCall.calories).toBe(450);

    // 2. runSyncRules (applyRules) pozvan sa deserijalizovanim EF response-om
    expect(deps.applyRules).toHaveBeenCalledTimes(1);
    const syncInput = (deps.applyRules as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(syncInput.nutrition.isMetabolicNoiseTriggered).toBe(true);

    // 3. save-user-status pozvan sa sync-derived status (ima _blockProgressionUntil)
    expect(deps.invokeSaveUserStatus).toHaveBeenCalledTimes(1);
    const savedArg = (deps.invokeSaveUserStatus as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedArg._blockProgressionUntil).toBeDefined();

    // 4. Orchestrator vraća finalni sync-derived status
    expect(result._blockProgressionUntil).toBeDefined();
    expect(result.nutrition.isMetabolicNoiseTriggered).toBe(true);
  });

  it("EF error — mutation throw-a, applyRules i invokeSaveUserStatus nisu pozvani", async () => {
    const deps = makeDeps({
      invokeProcessMealLog: vi.fn(async () => {
        throw new Error("process-meal-log failed: Invalid slotIndex");
      }),
    });

    await expect(runLogMeal(makePayload(), deps)).rejects.toThrow(
      /Invalid slotIndex/,
    );

    // Fail-fast — dalji koraci ne izvršavaju se
    expect(deps.applyRules).not.toHaveBeenCalled();
    expect(deps.invokeSaveUserStatus).not.toHaveBeenCalled();
  });

  it("skip meal — status='skipped' i svi makroi=0 šalju se na EF, orchestrator prolazi isti pattern", async () => {
    const skipResponse: ProcessMealLogResponse = {
      ok: true,
      status: makeStatus({
        redFlags: {
          ...makeStatus().redFlags,
          skipCount7d: 1, // EF je inkrementovao
        },
      }),
      liquidTotal: 0,
      isMetabolicNoiseTriggered: false,
    };

    const deps = makeDeps({
      invokeProcessMealLog: vi.fn(async () => skipResponse),
    });

    const skipPayload = makePayload({
      status: "skipped",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

    const result = await runLogMeal(skipPayload, deps);

    // Verifikuj da EF call dobio status='skipped' sa svim makroima=0
    const efCall = (deps.invokeProcessMealLog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(efCall.status).toBe("skipped");
    expect(efCall.calories).toBe(0);
    expect(efCall.protein).toBe(0);
    expect(efCall.carbs).toBe(0);
    expect(efCall.fat).toBe(0);

    // skipCount7d = 1 iz EF-a prolazi kroz applyRules i završava u save
    expect(deps.applyRules).toHaveBeenCalledTimes(1);
    expect(deps.invokeSaveUserStatus).toHaveBeenCalledTimes(1);
    expect(result.redFlags.skipCount7d).toBe(1);

    // Skip ne trigeruje noise, pa applyRules ne postavlja _blockProgressionUntil
    expect(result._blockProgressionUntil).toBeUndefined();
  });
});
