// ============================================================================
// Home.test.tsx — water widget integration (IT-14)
// ============================================================================
//
// Pokriveno (1 test):
//   - Water widget render-uje trenutni ml + target iz useHydration hook-a,
//     klik "+1 glass" poziva useLogWaterGlass().mutate sa clientId iz useAuth.
//
// Strategija mock-ovanja prati pattern iz Food.test.tsx / ActiveWorkout.test.tsx:
//   - useAuth, useUserStatus, useNextSession, useWeeklyCalendar → fixtures
//   - useLogWaterGlass → mutate spy
//   - DailyCheckInSheet → stub div (već mountuje React Query / Supabase real-time
//     path koji nije focus ovog testa)
//   - framer-motion → passthrough
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { UserStatus } from "@/types/userStatus";

// ----------------------------------------------------------------------------
// Mocks — module-scoped
// ----------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

const AUTH_FIXTURE = {
  user: { user_metadata: { first_name: "Sarah" } },
  clientId: "client-a",
  isLoading: false,
  isAuthenticated: true,
  isMockAuth: false,
  signOut: async () => {},
};
vi.mock("@/contexts/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("@/contexts/AuthContext")>(
    "@/contexts/AuthContext",
  );
  return { ...actual, useAuth: () => AUTH_FIXTURE };
});

vi.mock("@/hooks/useHaptic", () => ({
  useHaptic: () => vi.fn(),
}));

// Streak milestones — neutral stub
vi.mock("@/hooks/useStreakMilestones", () => ({
  useStreakMilestones: () => ({ milestone: null, dismissMilestone: () => {} }),
}));

// useStreak (W-5) — query hook bi inače zahtevao QueryClientProvider
vi.mock("@/hooks/useStreak", () => ({
  useStreak: () => ({ data: 0, isLoading: false, error: null }),
}));

// Weekly calendar — fallback empty (Home komponenta ima fallbackWeekDays)
vi.mock("@/hooks/useWeeklyCalendar", () => ({
  useWeeklyCalendar: () => ({ view: null, isLoading: false }),
}));

// Next session — null (rest day putanja je najjednostavnija)
vi.mock("@/hooks/useNextSession", () => ({
  useNextSession: () => ({ session: null, isLoading: false }),
}));

// UserStatus — minimal valid shape; useHydration ga čita (hydrationTodayMl,
// currentWeightMA5, queue).
function makeStatus(overrides: Partial<UserStatus> = {}): UserStatus {
  return {
    clientId: "client-a",
    lastUpdatedAt: new Date(),
    bio: {
      age: 30,
      currentWeightMA5: 70,
      weightTrend: "maintaining",
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
      hydrationTargetMl: 2450,
      hydrationTodayMl: 500, // 2 čaše već popijene
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

const STATUS_FIXTURE = makeStatus();

vi.mock("@/hooks/useUserStatus", () => ({
  useUserStatus: () => ({
    status: STATUS_FIXTURE,
    isLoading: false,
    error: null,
    refetch: async () => {},
  }),
}));

// DailyCheckInSheet — stub (interna logika testirana zasebno u IT-6)
vi.mock("@/components/checkin/DailyCheckInSheet", () => ({
  DailyCheckInSheet: () =>
    React.createElement("div", { "data-testid": "checkin-sheet-stub" }),
}));

// Achievement overlay — stub
vi.mock("@/components/AchievementOverlay", () => ({
  AchievementOverlay: () => null,
}));

// useLogWaterGlass — spy za mutate
const mockLogWater = vi.fn();
const LOG_WATER_FIXTURE = {
  mutate: mockLogWater,
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};
vi.mock("@/hooks/mutations/useLogWaterGlass", async () => {
  const actual = await vi.importActual<
    typeof import("@/hooks/mutations/useLogWaterGlass")
  >("@/hooks/mutations/useLogWaterGlass");
  return {
    ...actual,
    useLogWaterGlass: () => LOG_WATER_FIXTURE,
  };
});

// framer-motion passthrough (jsdom-safe). Mora podržati i motion.create(Comp)
// jer MotionCard koristi taj API (framer 11+).
vi.mock("framer-motion", async () => {
  const ReactLib = await import("react");
  const stripMotionProps = (
    props: Record<string, unknown> & { children?: React.ReactNode },
  ) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileTap: _whileTap,
      whileHover: _whileHover,
      layout: _layout,
      layoutId: _layoutId,
      ...rest
    } = props;
    return rest;
  };
  const passthroughTag = (tag: string) =>
    ReactLib.forwardRef(
      (
        props: Record<string, unknown> & { children?: React.ReactNode },
        ref: React.ForwardedRef<HTMLElement>,
      ) => ReactLib.createElement(tag, { ...stripMotionProps(props), ref }),
    );
  // motion.create(Comp) — wrap React komponentu u forwardRef sa istom
  // motion-prop filter logikom.
  const create = (
    Comp: React.ComponentType<Record<string, unknown>> | string,
  ) =>
    ReactLib.forwardRef(
      (
        props: Record<string, unknown> & { children?: React.ReactNode },
        ref: React.ForwardedRef<unknown>,
      ) =>
        ReactLib.createElement(
          Comp as React.ComponentType<Record<string, unknown>>,
          { ...stripMotionProps(props), ref } as Record<string, unknown>,
        ),
    );
  const motionProxy = new Proxy(
    { create },
    {
      get: (target: { create: typeof create }, key: string) => {
        if (key === "create") return target.create;
        return passthroughTag(key);
      },
    },
  );
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      ReactLib.createElement(ReactLib.Fragment, null, children),
  };
});

// ----------------------------------------------------------------------------
// Helper
// ----------------------------------------------------------------------------

async function renderHome() {
  const { default: Home } = await import("./Home");
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("Home — water widget (IT-14)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogWater.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders current hydration ml and target, +1 glass calls useLogWaterGlass.mutate", async () => {
    await renderHome();

    // Water widget — data-testid anchored
    const widget = screen.getByTestId("water-widget");
    expect(widget).toBeInTheDocument();

    // Current ml rendered (500ml iz fixture-a, no optimistic)
    const mlDisplay = screen.getByTestId("water-ml-display");
    expect(mlDisplay.textContent).toContain("500");

    // Target ml rendered — 70kg non-training = 2450ml (calcHydrationTarget(70, false))
    expect(mlDisplay.textContent).toContain("2450");

    // "+1 glass" dugme poziva useLogWaterGlass.mutate sa clientId
    const addBtn = screen.getByTestId("water-add-glass");
    fireEvent.click(addBtn);

    expect(mockLogWater).toHaveBeenCalledTimes(1);
    const [payload] = mockLogWater.mock.calls[0];
    expect(payload).toMatchObject({ clientId: "client-a" });
  });
});
