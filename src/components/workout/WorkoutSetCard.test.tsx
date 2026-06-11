// ============================================================================
// WorkoutSetCard — component testovi
// ============================================================================
//
// Pokriva: render aktivne/završene/neaktivne serije, +/− dugmad (onUpdate),
// direktan unos (onSetValue) i complete interakciju (onDone).
// ============================================================================

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { createRef } from "react";

// Deterministički render — bez framer-motion animacija (AnimatePresence height)
vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

// i18n — t() vraća ključ, pa asertujemo na ključeve (nezavisno od prevoda)
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "sr",
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

import WorkoutSetCard from "./WorkoutSetCard";
import type { SetLog } from "@/hooks/useWorkoutState";

// ----------------------------------------------------------------------------

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return { weight: 40, reps: 10, rir: null, done: false, ...overrides };
}

function renderCard(
  props: Partial<{
    set: SetLog;
    setIdx: number;
    isActive: boolean;
  }> = {},
) {
  const onUpdate = vi.fn();
  const onSetValue = vi.fn();
  const onDone = vi.fn();
  const activeSetRef = createRef<HTMLDivElement>();

  render(
    <WorkoutSetCard
      set={props.set ?? makeSet()}
      setIdx={props.setIdx ?? 0}
      isActive={props.isActive ?? true}
      activeSetRef={activeSetRef}
      onUpdate={onUpdate}
      onSetValue={onSetValue}
      onDone={onDone}
    />,
  );

  return { onUpdate, onSetValue, onDone };
}

describe("WorkoutSetCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("aktivna serija: prikazuje inpute za težinu i ponavljanja sa vrednostima", () => {
    renderCard({ set: makeSet({ weight: 42.5, reps: 8 }) });

    expect(screen.getByLabelText("workout.weight kg")).toHaveValue(42.5);
    expect(screen.getByLabelText("gym.reps")).toHaveValue(8);
    expect(
      screen.getByRole("button", { name: /workout\.doneSet 1/ }),
    ).toBeInTheDocument();
  });

  it("+/− dugmad za težinu zovu onUpdate sa ±2.5", () => {
    const { onUpdate } = renderCard({ setIdx: 0 });

    fireEvent.click(screen.getByRole("button", { name: "workout.weight +2.5" }));
    expect(onUpdate).toHaveBeenCalledWith(0, "weight", 2.5);

    fireEvent.click(screen.getByRole("button", { name: "workout.weight -2.5" }));
    expect(onUpdate).toHaveBeenCalledWith(0, "weight", -2.5);
  });

  it("+/− dugmad za ponavljanja zovu onUpdate sa ±1", () => {
    const { onUpdate } = renderCard({ setIdx: 2 });

    fireEvent.click(screen.getByRole("button", { name: "gym.reps +1" }));
    expect(onUpdate).toHaveBeenCalledWith(2, "reps", 1);

    fireEvent.click(screen.getByRole("button", { name: "gym.reps -1" }));
    expect(onUpdate).toHaveBeenCalledWith(2, "reps", -1);
  });

  it("direktan unos u input zove onSetValue sa brojem", () => {
    const { onSetValue } = renderCard({ setIdx: 0 });

    fireEvent.change(screen.getByLabelText("workout.weight kg"), {
      target: { value: "47.5" },
    });
    expect(onSetValue).toHaveBeenCalledWith(0, "weight", 47.5);

    fireEvent.change(screen.getByLabelText("gym.reps"), {
      target: { value: "12" },
    });
    expect(onSetValue).toHaveBeenCalledWith(0, "reps", 12);
  });

  it("klik na complete dugme zove onDone sa indeksom serije", () => {
    const { onDone } = renderCard({ setIdx: 1 });

    fireEvent.click(screen.getByRole("button", { name: /workout\.doneSet 2/ }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(1);
  });

  it("završena serija: prikazuje rezime (kg × reps), bez inputa i complete dugmeta", () => {
    renderCard({ set: makeSet({ weight: 40, reps: 10, done: true }) });

    expect(screen.getByText("40kg × 10")).toBeInTheDocument();
    expect(screen.queryByLabelText("workout.weight kg")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /workout\.doneSet/ }),
    ).not.toBeInTheDocument();
  });

  it("neaktivna nezavršena serija: bez kontrola, samo header", () => {
    renderCard({ isActive: false });

    expect(screen.getByText(/workout\.set 1/)).toBeInTheDocument();
    expect(screen.queryByLabelText("workout.weight kg")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /workout\.doneSet/ }),
    ).not.toBeInTheDocument();
  });
});
