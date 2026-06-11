// ============================================================================
// WorkoutExerciseInfo — feature flag gating testovi
// White-label: swap dugme vidljivo samo ako tenant ima exerciseSubstitution
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ActiveWorkoutSlot } from "@/hooks/useActiveWorkoutSession";

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

const { isFeatureEnabledMock } = vi.hoisted(() => ({
  isFeatureEnabledMock: vi.fn<(key: string) => boolean>(() => true),
}));

vi.mock("@/tenant.config", () => ({
  isFeatureEnabled: isFeatureEnabledMock,
}));

import WorkoutExerciseInfo from "./WorkoutExerciseInfo";

// ----------------------------------------------------------------------------

const SLOT = {
  slotIndex: 1,
  movementPattern: "hip_dominant",
  muscleGroup: "glutes",
  setsRange: [3, 4],
  repRange: [8, 12],
  priority: "primary",
  chosenExerciseId: 1,
  exerciseUuid: "uuid-1",
  exerciseName: "Hip Thrust",
  exerciseNameSr: "Hip potisak",
  resolvedRest: 120,
  previousMaxWeight: null,
  previousSessionDate: null,
} as unknown as ActiveWorkoutSlot;

function renderInfo() {
  const onOpenSwap = vi.fn();
  render(
    <WorkoutExerciseInfo
      slot={SLOT}
      overrideName={null}
      setsDone={0}
      setsTotal={3}
      onOpenSwap={onOpenSwap}
    />,
  );
  return { onOpenSwap };
}

describe("WorkoutExerciseInfo — exerciseSubstitution flag gating", () => {
  beforeEach(() => {
    isFeatureEnabledMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("flag ON → swap dugme vidljivo", () => {
    isFeatureEnabledMock.mockReturnValue(true);
    renderInfo();
    expect(isFeatureEnabledMock).toHaveBeenCalledWith("exerciseSubstitution");
    expect(screen.getByRole("button", { name: /swap|zameni/i })).toBeInTheDocument();
  });

  it("flag OFF → swap dugme sakriveno, naziv vežbe i dalje renderovan", () => {
    isFeatureEnabledMock.mockReturnValue(false);
    renderInfo();
    expect(screen.queryByRole("button", { name: /swap|zameni/i })).not.toBeInTheDocument();
    expect(screen.getByText("Hip Thrust")).toBeInTheDocument();
  });
});
