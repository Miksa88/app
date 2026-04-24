// ============================================================================
// useLogWaterGlass — tests za runLogWaterGlass orchestrator
// ============================================================================
//
// Pokriva 2 slučaja:
//   1. Happy path — INSERT uspeo, hydrationTodayMl += 250, save pozvan sa
//      patched status-om.
//   2. INSERT error — mutation throw-a, loadStatus i invokeSaveUserStatus nisu
//      pozvani (fail-fast).
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  runLogWaterGlass,
  DEFAULT_GLASS_ML,
} from "./useLogWaterGlass";
import type { LogWaterGlassDeps } from "./useLogWaterGlass";
import type { UserStatus } from "@/types/userStatus";

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

function makeDeps(overrides: Partial<LogWaterGlassDeps> = {}): LogWaterGlassDeps {
  return {
    insertWaterLog: vi.fn(async () => ({ error: null })),
    loadStatus: vi.fn(async () => makeStatus()),
    invokeSaveUserStatus: vi.fn(async () => {
      /* noop */
    }),
    ...overrides,
  };
}

describe("runLogWaterGlass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path — INSERT uspeo, hydrationTodayMl += 250, save pozvan sa patched status-om", async () => {
    const deps = makeDeps();

    const result = await runLogWaterGlass(
      { clientId: "client-a" },
      deps,
    );

    // 1. INSERT pozvan sa default 250ml glass size
    expect(deps.insertWaterLog).toHaveBeenCalledTimes(1);
    const insertArg = (deps.insertWaterLog as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(insertArg.user_id).toBe("client-a");
    expect(insertArg.ml_added).toBe(DEFAULT_GLASS_ML);
    expect(typeof insertArg.logged_at).toBe("string");

    // 2. loadStatus pozvan sa clientId
    expect(deps.loadStatus).toHaveBeenCalledWith("client-a");

    // 3. save pozvan sa patched hydrationTodayMl (1000 + 250 = 1250)
    expect(deps.invokeSaveUserStatus).toHaveBeenCalledTimes(1);
    const savedArg = (deps.invokeSaveUserStatus as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedArg.nutrition.hydrationTodayMl).toBe(1250);

    // 4. Orchestrator vraća patched status
    expect(result.nutrition.hydrationTodayMl).toBe(1250);
  });

  it("INSERT error — mutation throw-a, loadStatus i save nisu pozvani", async () => {
    const deps = makeDeps({
      insertWaterLog: vi.fn(async () => ({
        error: { code: "42501", message: "new row violates row-level security" },
      })),
    });

    await expect(
      runLogWaterGlass({ clientId: "client-a" }, deps),
    ).rejects.toThrow(/water_logs insert failed/);

    // Fail-fast — loadStatus i save nisu pozvani
    expect(deps.loadStatus).not.toHaveBeenCalled();
    expect(deps.invokeSaveUserStatus).not.toHaveBeenCalled();
  });
});
