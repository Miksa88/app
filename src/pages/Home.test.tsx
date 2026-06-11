// ============================================================================
// Home.test.tsx — pojednostavljeni Home smoke test (2026-05-08 v4)
// ============================================================================
//
// Pokriveno:
//   1. Header renderuje firstName + greeting
//   2. Three core cards: Danas (data centar), Današnji trening, Sledeći obrok
//   3. Daily check-in CTA banner se pokazuje kad nije rađen check-in danas
//
// Strategija mock-ovanja: sve hooks vraćaju neutralne fixtures.
// Skinut je water widget — feature uklonjen u v4 simplification.
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { UserStatus } from "@/types/userStatus";

// ── Mocks ─────────────────────────────────────────────────────────────────

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

vi.mock("@/hooks/useUnreadMessages", () => ({
  useUnreadMessages: () => 0,
}));
vi.mock("@/hooks/useClientPause", () => ({
  useClientPause: () => ({ data: null, isLoading: false, error: null }),
}));
vi.mock("@/hooks/useNextSession", () => ({
  useNextSession: () => ({ session: null, isLoading: false }),
}));
vi.mock("@/hooks/useDailyTotals", () => ({
  useDailyTotals: () => ({
    totals: { caloriesConsumed: 800, mealsLogged: 1, proteinConsumed: 40, carbsConsumed: 90, fatConsumed: 25 },
    isLoading: false,
    error: null,
    refetch: async () => {},
  }),
}));
vi.mock("@/hooks/useMealPlan", () => ({
  useMealPlan: () => ({ plan: null, isLoading: false, error: null }),
}));

function makeStatus(overrides: Partial<UserStatus> = {}): UserStatus {
  return {
    clientId: "client-a",
    lastUpdatedAt: new Date(2020, 0, 1),  // davno → check-in CTA se prikazuje
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
      hydrationLast7DaysAvgMl: 2000,
    } as UserStatus['bio'],
    training: {
      experienceLevel: 'beginner',
      daysPerWeek: 3,
      position: 'beginner_3',
      activeTemplateId: null,
      queue: { clientId: 'client-a', mesocycleIndex: 1, templateId: '', sessions: [], sessionPointer: 0, currentMicrocycleIndex: 0, swapUsedThisMicrocycle: false, partitionLastSeen: {}, returnFromBreakCountdown: {}, createdAt: new Date(), completedAt: null } as UserStatus['training']['queue'],
      nextSessionId: null,
      nextSessionPartition: null,
      isInDeload: false,
      isInReturnFromBreak: false,
      activePauseEvent: null,
    } as unknown as UserStatus['training'],
    nutrition: {
      bmr: 1400,
      tdee: 2000,
      currentCalorieTarget: 1600,
      targetMode: 'deficit',
      macros: { proteinG: 130, carbsG: 230, fatG: 60 },
      metabolicFilter: [],
      isMetabolicNoiseTriggered: false,
      hydrationTargetMl: 2275,
      hydrationTodayMl: 0,
      measurementWeekActive: false,
      measurementWeekDay: 0,
      daysSincePlanChange: 0,
      currentSmartCutStep: 0,
      activeRefeedDay: false,
    } as UserStatus['nutrition'],
    redFlags: { skipCount7d: 0, metabolicNoiseDays7d: 0, energyBelowThreshold7d: 0, consecutiveFailedWorkouts: 0, daysSinceLastWeeklyCheckIn: 0, isAtRisk: false },
    clientOverrides: [],
    ...overrides,
  };
}

vi.mock("@/hooks/useUserStatus", () => ({
  useUserStatus: () => ({ status: makeStatus(), isLoading: false, error: null }),
}));

// AlgorithmStatusBanners — pokazuje banner samo za određena stanja; testiramo
// odvojeno. Ovde stub.
vi.mock("@/components/algorithm/AlgorithmStatusBanners", () => ({
  default: () => <div data-testid="algorithm-banners" />,
}));

// framer-motion — passthrough
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
  const passthrough = (Comp: keyof JSX.IntrinsicElements) =>
    React.forwardRef((props: Record<string, unknown>, ref) =>
      React.createElement(Comp, { ...props, ref }),
    );
  return {
    ...actual,
    motion: new Proxy({}, { get: (_, prop) => passthrough(prop as keyof JSX.IntrinsicElements) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

async function renderHome() {
  // Force Serbian since string assertions below use SR copy.
  window.localStorage.setItem("app-language", "sr");
  const Home = (await import("./Home")).default;
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("Home — simplified v4 (3 cards + notifications)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("renderuje pozdrav sa firstName-om", async () => {
    await renderHome();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Sarah");
  });

  it("prikazuje 3 sekcije: Danas, Današnji trening, Obroci/Sledeći obrok", async () => {
    await renderHome();
    expect(screen.getByText("Danas")).toBeInTheDocument();
    expect(screen.getByText("Današnji trening")).toBeInTheDocument();
    // Sledeći obrok ili "Obroci" (kad nema mealPlan)
    const mealCard = screen.queryByText("Sledeći obrok") ?? screen.getByText("Obroci");
    expect(mealCard).toBeInTheDocument();
  });

  it("ne prikazuje daily check-in CTA (uklonjen — pre-workout dialog ga zamenjuje)", async () => {
    await renderHome();
    expect(screen.queryByText("Jutarnji check-in")).not.toBeInTheDocument();
    expect(screen.queryByTestId("daily-checkin-cta")).not.toBeInTheDocument();
  });

  it("prikazuje kalorija counter (current / target)", async () => {
    await renderHome();
    // 800 / 1600 kcal iz fixture-a; "800" je pojedeno, "1600 kcal" je target
    expect(screen.getAllByText(/800/).length).toBeGreaterThan(0);
    expect(screen.getByText(/1600 kcal/)).toBeInTheDocument();
  });
});
