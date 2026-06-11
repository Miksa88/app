// ============================================================================
// WorkoutRestScreen — component testovi
// ============================================================================
//
// Komponenta je čista prezentacija — tajmer (setInterval) živi u parent
// hook-u (useWorkoutTimer), pa je test deterministički bez fake timers:
// restTime stiže kao prop.
// ============================================================================

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

// i18n — t() vraća ključ
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    language: "sr",
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

import WorkoutRestScreen from "./WorkoutRestScreen";

describe("WorkoutRestScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("prikazuje preostalo vreme u mm:ss formatu", () => {
    render(<WorkoutRestScreen restTime={90} maxRest={120} onSkip={vi.fn()} />);

    expect(screen.getByText("1:30")).toBeInTheDocument();
    // a11y: timer landmark sa live announcement-om
    expect(screen.getByRole("timer")).toHaveAttribute(
      "aria-label",
      "workout.rest: 1:30",
    );
  });

  it("sekunde ispod 10 su zero-padded (0:05)", () => {
    render(<WorkoutRestScreen restTime={5} maxRest={120} onSkip={vi.fn()} />);

    expect(screen.getByText("0:05")).toBeInTheDocument();
  });

  it("prikaz se ažurira kad restTime prop padne (parent tick)", () => {
    const { rerender } = render(
      <WorkoutRestScreen restTime={61} maxRest={120} onSkip={vi.fn()} />,
    );
    expect(screen.getByText("1:01")).toBeInTheDocument();

    rerender(<WorkoutRestScreen restTime={60} maxRest={120} onSkip={vi.fn()} />);
    expect(screen.getByText("1:00")).toBeInTheDocument();
    expect(screen.queryByText("1:01")).not.toBeInTheDocument();
  });

  it("klik na skip dugme zove onSkip", () => {
    const onSkip = vi.fn();
    render(<WorkoutRestScreen restTime={30} maxRest={120} onSkip={onSkip} />);

    fireEvent.click(screen.getByRole("button", { name: "workout.skipRest" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
