// ============================================================================
// useDailyCheckIn tests
// ============================================================================
//
// Testiramo `runDailyCheckIn` orchestrator direktno (bez renderHook) — React
// Query testing setup bi zahtevao QueryClientProvider wrapper i polling kroz
// `waitFor(() => mutation.isSuccess)`, što za 4 test case-a nije isplativo.
// Orchestrator je čist async funkcija i pokriva sve biznis invariante.
//
// Hook sam (useDailyCheckIn) je tanak useMutation wrapper — njegovu ulogu
// (cache invalidation + toast) bi trebalo da pokrije integracioni test u
// IT-6 (DailyCheckInSheet) kroz RTL render.
//
// Pokriveni slučajevi (4):
//   1. Happy path — oba EF-a uspeli, patched MA5 = 60.2, recoveryMultiplier
//      rekomputiran sa patched sleep/stress avg-ovima.
//   2. EF compute vraća null MA5 (insufficient history) — patch fallback-uje
//      na mock MA5 iz applyDailyCheckIn (= checkIn.weightKg).
//   3. process-daily-check-in vrati error → throw, save-EF niti loadStatus
//      ne zvani (fail-fast), invokeSave nije pozvan.
//   4. save-user-status vrati error → throw, ali invokeProcess JE pozvan
//      (append-only DB writes su uspeli; Sync Engine idempotentnost pokriva
//      retry scenario).
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

import { runDailyCheckIn } from "./useDailyCheckIn";
import type {
  DailyCheckInDeps,
  ProcessDailyCheckInResponse,
} from "./useDailyCheckIn";
import type { DailyCheckIn } from "@/types/nutrition";
import type { UserStatus } from "@/types/userStatus";

// ----------------------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------------------

function makeStatus(overrides: Partial<UserStatus> = {}): UserStatus {
  return {
    clientId: "client-a",
    lastUpdatedAt: new Date("2026-04-23T00:00:00Z"),
    bio: {
      age: 30,
      currentWeightMA5: 62.0, // mock pre check-in-a (promeniće se posle applyDailyCheckIn)
      weightTrend: "insufficient_data",
      weeklyWeightDelta: 0,
      cycleDay: null,
      cyclePhase: null,
      weightDataReliable: true,
      recoveryMultiplier: 1.0,
      sleepLast7DaysAvg: 7,
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
      hydrationTodayMl: 0,
      measurementWeekActive: true,
      measurementWeekDay: 1,
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

function makeCheckIn(overrides: Partial<DailyCheckIn> = {}): DailyCheckIn {
  return {
    clientId: "client-a",
    date: new Date("2026-04-23T08:00:00Z"),
    weightKg: 60.5,
    energyLevel: 7,
    stressLevel: 3,
    sleepHours: 7.5,
    waterIntakeMl: 2000,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<DailyCheckInDeps> = {}): DailyCheckInDeps {
  const defaultComputed: ProcessDailyCheckInResponse = {
    ok: true,
    ma5: 60.2,
    reliableSampleCount: 5,
    sleepLast7DaysAvg: 7.1,
    stressLast7DaysAvg: 3,
    hydrationLast7DaysAvgMl: 2050,
  };

  return {
    invokeProcess: vi.fn(async () => defaultComputed),
    invokeSave: vi.fn(async () => {
      /* noop */
    }),
    loadStatus: vi.fn(async () => makeStatus()),
    // Realni applyDailyCheckIn je pure transformer — koristimo minimalan mock
    // koji simulira njegovo ponašanje: kopira checkIn vrednosti u bio (kao
    // "mock MA5"). Test 1 i 2 proveravaju da PATCH posle transformera
    // ispravno overrid-a ili zadržava ove vrednosti.
    applyCheckIn: vi.fn(async (status, checkIn) => ({
      ...status,
      bio: {
        ...status.bio,
        currentWeightMA5: checkIn.weightKg, // mock MA5 = dnevna weight vrednost
        sleepLast7DaysAvg: checkIn.sleepHours,
        stressLast7DaysAvg: checkIn.stressLevel,
        hydrationLast7DaysAvgMl: checkIn.waterIntakeMl,
      },
    })),
    ...overrides,
  };
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("runDailyCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path — patchuje MA5 i rekompjutuje recoveryMultiplier sa patched avg-ovima", async () => {
    // EF compute vraća realne 7-day avg vrednosti drugačije od dnevnih
    // iz check-in-a. Hook mora da ih patchuje PREKO onih koje je
    // applyDailyCheckIn-ov mock transformer postavio iz dnevne tačke.
    const computed: ProcessDailyCheckInResponse = {
      ok: true,
      ma5: 60.2,
      reliableSampleCount: 5,
      sleepLast7DaysAvg: 8.0, // prosek viši od dnevnih 7.5
      stressLast7DaysAvg: 1, // prosek niži od dnevnih 3
      hydrationLast7DaysAvgMl: 2200,
    };

    const deps = makeDeps({
      invokeProcess: vi.fn(async () => computed),
    });

    const result = await runDailyCheckIn("client-a", makeCheckIn(), deps);

    // MA5 iz EF-a overrid-uje mock (60.5 → 60.2)
    expect(result.bio.currentWeightMA5).toBe(60.2);

    // 7-day avg-ovi overrid-ovani iz EF-a
    expect(result.bio.sleepLast7DaysAvg).toBe(8.0);
    expect(result.bio.stressLast7DaysAvg).toBe(1);
    expect(result.bio.hydrationLast7DaysAvgMl).toBe(2200);

    // Recovery multiplier rekompjutiran sa patched vrednostima.
    // calcRecoveryMultiplier(sleep=8, stress=1, age=30, []) =
    //   base 1.0 + 0.05 (sleep>=8) + 0.05 (stress=1) = 1.10 (clamped to ceil).
    expect(result.bio.recoveryMultiplier).toBeCloseTo(1.1, 2);

    // Oba EF-a pozvana, save posle process-a
    expect(deps.invokeProcess).toHaveBeenCalledTimes(1);
    expect(deps.invokeSave).toHaveBeenCalledTimes(1);
    // Save dobija patched status (sa 60.2 MA5)
    const savedArg = (deps.invokeSave as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(savedArg.bio.currentWeightMA5).toBe(60.2);
  });

  it("EF vraća null MA5 (insufficient history) — patch fallback-uje na mock MA5 iz transformera", async () => {
    const computed: ProcessDailyCheckInResponse = {
      ok: true,
      ma5: null, // < 5 pouzdanih uzoraka
      reliableSampleCount: 2,
      sleepLast7DaysAvg: null, // 0 non-menstrual dana
      stressLast7DaysAvg: null,
      hydrationLast7DaysAvgMl: null,
    };

    const deps = makeDeps({
      invokeProcess: vi.fn(async () => computed),
    });

    const checkIn = makeCheckIn({ weightKg: 60.5 });
    const result = await runDailyCheckIn("client-a", checkIn, deps);

    // MA5 null → zadrži mock vrednost iz applyDailyCheckIn transformera
    // (transformer je postavio currentWeightMA5 = checkIn.weightKg = 60.5)
    expect(result.bio.currentWeightMA5).toBe(60.5);

    // Isto za sleep/stress/hydration — null → transformer mock vrednost
    // (= dnevna vrednost iz check-in-a)
    expect(result.bio.sleepLast7DaysAvg).toBe(checkIn.sleepHours);
    expect(result.bio.stressLast7DaysAvg).toBe(checkIn.stressLevel);
    expect(result.bio.hydrationLast7DaysAvgMl).toBe(checkIn.waterIntakeMl);

    // Save ipak pozvan — null MA5 nije error, samo "nedovoljno istorije"
    expect(deps.invokeSave).toHaveBeenCalledTimes(1);
  });

  it("process-daily-check-in vraća error — mutation throw-a, save nije pozvan", async () => {
    const deps = makeDeps({
      invokeProcess: vi.fn(async () => {
        throw new Error("process-daily-check-in failed: Invalid `weightKg` (20–300)");
      }),
    });

    await expect(
      runDailyCheckIn("client-a", makeCheckIn(), deps),
    ).rejects.toThrow(/Invalid .weightKg/);

    // Fail-fast — ako compute padne, dalji koraci se ne izvršavaju
    expect(deps.loadStatus).not.toHaveBeenCalled();
    expect(deps.applyCheckIn).not.toHaveBeenCalled();
    expect(deps.invokeSave).not.toHaveBeenCalled();
  });

  it("illness pauza aktivna — recoveryMultiplier ukljucuje -0.15 penalty (spec §4.8)", async () => {
    // IT-16: ako activePauseEvent.type === 'illness', hook prosledi -0.15
    // illnessPenalty u calcRecoveryMultiplier pre finalnog save-a.
    //
    // Baseline sleep/stress iz happy path mock-a: sleep 8, stress 1.
    // calc bez penalty-a: 1.0 + 0.05 + 0.05 = 1.10.
    // calc sa illness -0.15: 1.10 + (-0.15) = 0.95 (unutar [0.7, 1.1] floora).
    const computed: ProcessDailyCheckInResponse = {
      ok: true,
      ma5: 60.2,
      reliableSampleCount: 5,
      sleepLast7DaysAvg: 8.0,
      stressLast7DaysAvg: 1,
      hydrationLast7DaysAvgMl: 2200,
    };

    const statusWithIllness = makeStatus({
      training: {
        ...makeStatus().training,
        activePauseEvent: {
          type: 'illness',
          startDate: new Date('2026-04-20T00:00:00Z'),
          penaltySessionsRemaining: 2,
        },
      },
    });

    const deps = makeDeps({
      invokeProcess: vi.fn(async () => computed),
      loadStatus: vi.fn(async () => statusWithIllness),
      // Transformer zadrzava activePauseEvent (ne dira ga pri daily check-in-u)
      applyCheckIn: vi.fn(async (status, checkIn) => ({
        ...status,
        bio: {
          ...status.bio,
          currentWeightMA5: checkIn.weightKg,
          sleepLast7DaysAvg: checkIn.sleepHours,
          stressLast7DaysAvg: checkIn.stressLevel,
          hydrationLast7DaysAvgMl: checkIn.waterIntakeMl,
        },
      })),
    });

    const result = await runDailyCheckIn("client-a", makeCheckIn(), deps);

    // calcRecoveryMultiplier(sleep=8, stress=1, age=30, [], illnessPenalty=-0.15)
    //   = 1.0 + 0.05 + 0.05 + (-0.15) = 0.95 (clamp no-op, unutar floor-a)
    expect(result.bio.recoveryMultiplier).toBeCloseTo(0.95, 2);

    // activePauseEvent preserved (transformer nije dirao)
    expect(result.training.activePauseEvent?.type).toBe('illness');
  });

  it("save-user-status vraća error — mutation throw-a, ali process-EF JE pozvan (append-only writes stoje)", async () => {
    const deps = makeDeps({
      invokeSave: vi.fn(async () => {
        throw new Error("save-user-status failed: upstream 500");
      }),
    });

    await expect(
      runDailyCheckIn("client-a", makeCheckIn(), deps),
    ).rejects.toThrow(/save-user-status failed/);

    // DB writes iz process EF-a su već zapisani (daily_check_ins + weight_logs
    // su append-only). Ne rollback-ujemo — Sync Engine je idempotentan, pa
    // retry hook-a (sledeći dan ili manuelno) dovešće do istog patched
    // UserStatus-a.
    expect(deps.invokeProcess).toHaveBeenCalledTimes(1);
    expect(deps.loadStatus).toHaveBeenCalledTimes(1);
    expect(deps.applyCheckIn).toHaveBeenCalledTimes(1);
    expect(deps.invokeSave).toHaveBeenCalledTimes(1);
  });
});
