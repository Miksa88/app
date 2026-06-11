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

// useUserStatus — mutable fixture; status kontroliše fatigue dialog effect.
// refetch je mock koji NE menja status (simulira stale keš — upravo scenario
// P0 reopen-loop buga).
const mockRefetchStatus = vi.fn(() => Promise.resolve());
const USER_STATUS_FIXTURE: {
  status: unknown;
  isLoading: boolean;
  error: null;
  refetch: () => Promise<void>;
} = {
  status: null,
  isLoading: false,
  error: null,
  refetch: mockRefetchStatus,
};

vi.mock("@/hooks/useUserStatus", () => ({
  useUserStatus: () => USER_STATUS_FIXTURE,
}));

const mockSaveFatigueSignal = vi.fn<
  (clientId: string, fatigued: boolean) => Promise<void>
>(() => Promise.resolve());
vi.mock("@/services/biofeedbackService", () => ({
  saveFatigueSignal: (clientId: string, fatigued: boolean) =>
    mockSaveFatigueSignal(clientId, fatigued),
}));

/** UserStatus stub — samo bio deo koji fatigue effect čita */
function statusWithAnsweredAt(answeredAt: string | null) {
  return { bio: { preWorkoutFatigueAnsweredAt: answeredAt } };
}

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
    mockSaveFatigueSignal.mockReset();
    mockSaveFatigueSignal.mockImplementation(() => Promise.resolve());
    mockRefetchStatus.mockReset();
    USER_STATUS_FIXTURE.status = null;
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

  // --------------------------------------------------------------------------
  // PreWorkoutFatigueDialog reopen-loop (P0 bugfix)
  //
  // Bug: posle odgovora (ili X dismiss-a) status keš ostaje stale
  // (preWorkoutFatigueAnsweredAt nije danas) → auto-open effect je odmah
  // ponovo otvarao dijalog. Fix: fatigueDialogResolved u reducer-u.
  // --------------------------------------------------------------------------

  describe("PreWorkoutFatigueDialog reopen-loop (P0)", () => {
    const DIALOG_TITLE = "How are you feeling?";

    it("odgovor zatvara dijalog i NE reopen-uje (status keš ostaje stale)", async () => {
      USER_STATUS_FIXTURE.status = statusWithAnsweredAt(null);
      await renderActiveWorkout();

      // Dijalog se auto-otvorio (nije odgovoreno danas)
      expect(screen.getByText(DIALOG_TITLE)).toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: /Rested — standard workout/ }),
      );

      // Optimistički zatvoren — i NE sme da se ponovo otvori iako je
      // status i dalje stale (refetch mock ne menja status)
      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
      expect(mockSaveFatigueSignal).toHaveBeenCalledWith("client-a", false);

      // Re-render ciklusi (effect bi bez fix-a reopen-ovao odmah)
      await vi.advanceTimersByTimeAsync(0);
      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();

      // Posle uspešnog save-a se osvežava user status (stale keš fix)
      expect(mockRefetchStatus).toHaveBeenCalledTimes(1);
    });

    it("X (dismiss) zatvara dijalog i NE reopen-uje", async () => {
      USER_STATUS_FIXTURE.status = statusWithAnsweredAt(null);
      await renderActiveWorkout();

      expect(screen.getByText(DIALOG_TITLE)).toBeInTheDocument();

      // Radix DialogContent X dugme (sr-only "Close")
      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
      expect(mockSaveFatigueSignal).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(0);
      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
    });

    it("sledeći mount (novi dan, answeredAt nije danas) opet pita", async () => {
      USER_STATUS_FIXTURE.status = statusWithAnsweredAt(null);
      const first = await renderActiveWorkout();

      fireEvent.click(
        screen.getByRole("button", { name: /Rested — standard workout/ }),
      );
      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();

      first.unmount();

      // Novi mount — answeredAt od juče (nije danas) → dijalog se opet otvara
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      USER_STATUS_FIXTURE.status = statusWithAnsweredAt(yesterday);
      await renderActiveWorkout();

      expect(screen.getByText(DIALOG_TITLE)).toBeInTheDocument();
    });

    it("answeredAt danas → dijalog se uopšte ne otvara", async () => {
      USER_STATUS_FIXTURE.status = statusWithAnsweredAt(
        new Date().toISOString(),
      );
      await renderActiveWorkout();

      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
    });
  });
});
