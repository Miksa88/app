// ============================================================================
// ActiveWorkout — integration render test (IT-9)
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { LanguageProvider } from "@/contexts/LanguageContext";

// ----------------------------------------------------------------------------
// Mocks — stabilni module-scoped fixtures da hook pozivi vracaju iste
// reference preko rendera.
// ----------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCompleteSet = vi.fn();
const mockFinishWorkout = vi.fn();
const mockHaptic = vi.fn();

vi.mock("@/hooks/useHaptic", () => ({
  useHaptic: () => mockHaptic,
}));

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
  return {
    ...actual,
    useAuth: () => AUTH_FIXTURE,
  };
});

const COMPLETE_SET_FIXTURE = {
  mutate: mockCompleteSet,
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};

const FINISH_WORKOUT_FIXTURE = {
  mutate: mockFinishWorkout,
  isPending: false,
  isSuccess: false,
  isError: false,
  error: null,
};

vi.mock("@/hooks/mutations/useCompleteSet", () => ({
  useCompleteSet: () => COMPLETE_SET_FIXTURE,
}));

vi.mock("@/hooks/mutations/useFinishWorkout", () => ({
  useFinishWorkout: () => FINISH_WORKOUT_FIXTURE,
}));

// Stub framer-motion — smanjuje chance infinite animation loop u jsdom-u
// (AnimatePresence + layout + spring mozda triggeruju reflow pozive koje
// jsdom ne implementira idealno).
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

const MOCK_SESSION_DATA = {
  session: {
    sessionId: "sess-A1",
    label: "Day A",
    dayType: "A",
  },
  slots: [
    {
      slotIndex: 0,
      movementPattern: "hinge",
      muscleGroup: "glutes",
      setsRange: [1, 1] as [number, number],
      repRange: [8, 10] as [number, number],
      priority: "primary" as const,
      chosenExerciseId: 12345,
      finalSets: 1,
      targetReps: "8-10",
      targetWeight: 40,
      targetRIR: 2,
      targetRest: 90,
      exerciseUuid: "uuid-ex-1",
      exerciseName: "Barbell Hip Thrust",
      exerciseNameSr: "Hip Thrust",
      resolvedRest: 90,
    },
  ],
  loadingMode: "PROGRESS" as const,
  targetRIR: 2,
  dayLabel: "Day A",
  exerciseUuidById: new Map<number, string>([[12345, "uuid-ex-1"]]),
};

const SESSION_HOOK_FIXTURE = {
  isLoading: false,
  error: null,
  data: MOCK_SESSION_DATA,
};

vi.mock("@/hooks/useActiveWorkoutSession", () => ({
  useActiveWorkoutSession: () => SESSION_HOOK_FIXTURE,
}));

// ----------------------------------------------------------------------------
// Helper
// ----------------------------------------------------------------------------

async function renderActiveWorkout() {
  const { default: ActiveWorkout } = await import("./ActiveWorkout");
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>
        <MemoryRouter>
          <ActiveWorkout />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("ActiveWorkout (IT-9 wiring)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockReset();
    mockCompleteSet.mockReset();
    mockFinishWorkout.mockReset();
    mockHaptic.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders slot name and Done Set button from hook data", async () => {
    await renderActiveWorkout();

    expect(screen.getByText(/Barbell Hip Thrust/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Done Set 1/i }),
    ).toBeInTheDocument();
  });

  it("Done Set klik okida useCompleteSet.mutate + useFinishWorkout.mutate + navigate", async () => {
    // Fake timers — handleFinishWorkout delays mutation by 5s (Undo window).
    vi.useFakeTimers();
    try {
      await renderActiveWorkout();

      mockFinishWorkout.mockImplementation(
        (
          _input: unknown,
          opts?: { onSuccess?: () => void },
        ) => {
          opts?.onSuccess?.();
        },
      );

      const doneBtn = screen.getByRole("button", { name: /Done Set 1/i });
      fireEvent.click(doneBtn);

      expect(mockCompleteSet).toHaveBeenCalledTimes(1);
      const [completeArgs] = mockCompleteSet.mock.calls[0];
      expect(completeArgs).toMatchObject({
        userId: "client-a",
        exerciseId: "uuid-ex-1",
        setNumber: 1,
        weightKg: 40,
        reps: 10,
        rir: 2,
      });

      expect(mockHaptic).toHaveBeenCalledWith("medium");
      expect(mockHaptic).toHaveBeenCalledWith("success");

      // Advance 5s — Undo window closes, finishWorkout actually fires.
      vi.advanceTimersByTime(5000);

      expect(mockFinishWorkout).toHaveBeenCalledTimes(1);
      const [finishArgs] = mockFinishWorkout.mock.calls[0];
      expect(finishArgs).toMatchObject({
        clientId: "client-a",
        sessionId: "sess-A1",
      });

      expect(mockNavigate).toHaveBeenCalledWith("/workout/complete");
    } finally {
      vi.useRealTimers();
    }
  });
});
