// ============================================================================
// Food.tsx — RTL integration test (IT-13)
// ============================================================================
//
// Pokriveni slučajevi (2):
//   1. Renders meal slots sa mock useUserStatus + mock useFoodItems data.
//      Verifikuje da se header "Nutrition" + 5 meal card-ova (DEFAULT_5_MEAL_SLOTS)
//      render-uju iz generisanog plana.
//   2. "Mark eaten" dugme u meal detail sheet-u poziva useLogMeal.mutate sa
//      ispravnim payload-om (clientId, mealId, slotIndex, calories/protein/
//      carbs/fat derive-ani iz generated meal-a).
//
// Mock strategija:
//   - useAuth → { clientId: "client-a" }
//   - useUserStatus → fixed UserStatus (metabolicFilter=[], cyclePhase=null)
//   - useFoodItems → mali fiksni pool od 3 jela da bi generateMealPlan mogao da
//     match-uje meal slots bez hita u mrežu
//   - useLogMeal / useSkipMeal / useReplaceMeal → spy-evane mutate fn
//   - framer-motion → stub (kao u ActiveWorkout.test.tsx) radi jsdom stabilnosti
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

import { LanguageProvider } from "@/contexts/LanguageContext";
import type { UserStatus } from "@/types/userStatus";
import type { FoodItem } from "@/data/foodDatabase";

// ----------------------------------------------------------------------------
// Mocks — module-scoped fixtures
// ----------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

const AUTH_FIXTURE = {
  user: null,
  clientId: "client-a",
  isLoading: false,
  isAuthenticated: true,
  isMockAuth: false,
  signOut: async () => {},
};
vi.mock("@/contexts/AuthContext", async () => {
  const actual = await vi.importActual<
    typeof import("@/contexts/AuthContext")
  >("@/contexts/AuthContext");
  return { ...actual, useAuth: () => AUTH_FIXTURE };
});

// Haptic — neutral stub
vi.mock("@/hooks/useHaptic", () => ({
  useHaptic: () => vi.fn(),
}));

// ----------------------------------------------------------------------------
// UserStatus fixture — minimalno potrebna struktura za Food.tsx render
// ----------------------------------------------------------------------------

function makeStatus(overrides: Partial<UserStatus> = {}): UserStatus {
  return {
    clientId: "client-a",
    lastUpdatedAt: new Date("2026-04-24T10:00:00Z"),
    bio: {
      age: 30,
      currentWeightMA5: 65,
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
      hydrationTodayMl: 0,
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

const STATUS_FIXTURE = makeStatus();

vi.mock("@/hooks/useUserStatus", () => ({
  useUserStatus: () => ({
    status: STATUS_FIXTURE,
    isLoading: false,
    error: null,
    refetch: async () => {},
  }),
}));

// useFoodItems — mali fiksni pool pokriva sve meal slot tipove
const FOOD_POOL_FIXTURE: FoodItem[] = [
  {
    id: "db-f1", name: "Greek Yogurt Bowl", nameEn: "Greek Yogurt Bowl", nameSr: "Grčki jogurt",
    description: "", calories: 400, protein: 30, carbs: 40, fat: 10,
    fiber: 4, sugar: 0, sodium: 0,
    portionSize: "1 serving", mealSlots: ["breakfast"],
    ingredients: ["yogurt", "berries"], preparation: [],
    allergens: ["lactose"], tags: ["high-protein"],
    glycemicIndex: "low", prepTime: "", imageUrl: null,
  },
  {
    id: "db-f2", name: "Grilled Chicken Salad", nameEn: "Grilled Chicken Salad", nameSr: "Piletina sa salatom",
    description: "", calories: 500, protein: 45, carbs: 30, fat: 15,
    fiber: 6, sugar: 0, sodium: 0,
    portionSize: "1 serving", mealSlots: ["lunch", "dinner"],
    ingredients: ["chicken", "lettuce"], preparation: [],
    allergens: [], tags: ["high-protein"],
    glycemicIndex: "low", prepTime: "", imageUrl: null,
  },
  {
    id: "db-f3", name: "Protein Snack", nameEn: "Protein Snack", nameSr: "Proteinski snack",
    description: "", calories: 200, protein: 20, carbs: 15, fat: 5,
    fiber: 2, sugar: 0, sodium: 0,
    portionSize: "1 serving", mealSlots: ["snack_am", "snack_pm"],
    ingredients: ["protein bar"], preparation: [],
    allergens: [], tags: ["high-protein"],
    glycemicIndex: "low", prepTime: "", imageUrl: null,
  },
];

vi.mock("@/hooks/useFoodItems", () => ({
  useFoodItems: () => ({
    foods: FOOD_POOL_FIXTURE,
    isLoading: false,
    error: null,
  }),
}));

// ----------------------------------------------------------------------------
// Mutation mocks — hvataju mutate calls
// ----------------------------------------------------------------------------

const mockLogMeal = vi.fn();
const mockSkipMeal = vi.fn();
const mockReplaceMeal = vi.fn();

const LOG_FIXTURE = { mutate: mockLogMeal, isPending: false, isSuccess: false, isError: false, error: null };
const SKIP_FIXTURE = { mutate: mockSkipMeal, isPending: false, isSuccess: false, isError: false, error: null };
const REPLACE_FIXTURE = { mutate: mockReplaceMeal, isPending: false, isSuccess: false, isError: false, error: null };

vi.mock("@/hooks/mutations/useLogMeal", () => ({
  useLogMeal: () => LOG_FIXTURE,
  useSkipMeal: () => SKIP_FIXTURE,
  useReplaceMeal: () => REPLACE_FIXTURE,
}));

// FuelingStatusBar and SyncEventBanner — stub as simple divs (realne komponente
// koriste React Query i supabase realtime; Food.tsx ih samo embed-uje).
vi.mock("@/components/queue/FuelingStatusBar", () => ({
  FuelingStatusBar: () => React.createElement("div", { "data-testid": "fueling-status-bar" }),
}));
vi.mock("@/components/queue/SyncEventBanner", () => ({
  SyncEventBanner: () => React.createElement("div", { "data-testid": "sync-event-banner" }),
}));

// framer-motion passthrough (jsdom-safe)
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const passthrough = (tag: string) =>
    React.forwardRef(
      (
        props: Record<string, unknown> & { children?: React.ReactNode },
        ref: React.ForwardedRef<HTMLElement>,
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
        return React.createElement(tag, { ...rest, ref });
      },
    );
  return {
    motion: new Proxy(
      {},
      {
        get: (_t, key: string) => passthrough(key),
      },
    ),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// ----------------------------------------------------------------------------
// Helper — render Food wrapped u potrebne provider-e
// ----------------------------------------------------------------------------

async function renderFood() {
  const { default: Food } = await import("./Food");
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <Food />
      </MemoryRouter>
    </LanguageProvider>,
  );
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("Food (IT-13 wiring)", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockLogMeal.mockReset();
    mockSkipMeal.mockReset();
    mockReplaceMeal.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders meal slots from generated plan based on useUserStatus + useFoodItems", async () => {
    await renderFood();

    // Header title — LanguageProvider default = en, "Nutrition"
    expect(screen.getByText(/Nutrition/i)).toBeInTheDocument();

    // Today's Meals section label
    expect(screen.getByText(/Today's Meals/i)).toBeInTheDocument();

    // Generisan plan iz DEFAULT_5_MEAL_SLOTS → 5 meal card-ova. Koristićemo
    // prisustvo "kcal" mikrotipova i jedno poznato ime iz food pool-a.
    expect(screen.getAllByText(/kcal/i).length).toBeGreaterThanOrEqual(5);

    // Makar jedno jelo iz pool-a treba biti vidljivo (breakfast slot)
    expect(screen.getByText(/Greek Yogurt Bowl/i)).toBeInTheDocument();

    // Stub-ovi za FuelingStatusBar + SyncEventBanner
    expect(screen.getByTestId("fueling-status-bar")).toBeInTheDocument();
    expect(screen.getByTestId("sync-event-banner")).toBeInTheDocument();
  });

  it("'Mark eaten' poziva useLogMeal.mutate sa payload-om iz generated meal-a", async () => {
    await renderFood();

    // Klik na prvi meal card otvara detail sheet (role="dialog")
    // Prvi meal = breakfast = Greek Yogurt Bowl (id db-f1)
    const firstMealBtn = screen.getByText(/Greek Yogurt Bowl/i).closest("button");
    expect(firstMealBtn).not.toBeNull();
    fireEvent.click(firstMealBtn!);

    // U detail sheet-u pojavi se "Mark as eaten" button (nutrition.markEaten)
    const markEatenBtn = screen.getByRole("button", { name: /Mark as eaten|Mark eaten/i });
    fireEvent.click(markEatenBtn);

    expect(mockLogMeal).toHaveBeenCalledTimes(1);
    const [payload] = mockLogMeal.mock.calls[0];
    expect(payload).toMatchObject({
      clientId: "client-a",
      mealId: "db-f1",
      slotIndex: 0,
    });
    // Makronumeri su derive-ani iz generated meal-a — proveravamo tipove i
    // pozitivne vrednosti (tačan broj zavisi od recalcCalorieTarget-a).
    expect(typeof payload.calories).toBe("number");
    expect(payload.calories).toBeGreaterThan(0);
    expect(typeof payload.protein).toBe("number");
    expect(typeof payload.carbs).toBe("number");
    expect(typeof payload.fat).toBe("number");
  });
});
