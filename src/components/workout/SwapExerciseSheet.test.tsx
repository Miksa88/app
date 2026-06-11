// ============================================================================
// SwapExerciseSheet — component testovi
// MVP_PRESET gap #2 — klijent-facing exercise substitution
// ============================================================================
//
// Pokriva:
//  - equipment filter (klijentkinja vidi samo vežbe za koje ima opremu;
//    bodyweight uvek prolazi; prazan profil → bez filtera)
//  - ranking po scoring logici surgical swap-a (stretch > shortened)
//  - "Zameni trajno" toggle → onPick(ex, { permanent: true })
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { Exercise } from "@/types/training";

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

const { listExercisesByPatternMock, clientEquipmentRef } = vi.hoisted(() => ({
  listExercisesByPatternMock: vi.fn<() => Promise<Exercise[]>>(() =>
    Promise.resolve([]),
  ),
  clientEquipmentRef: { current: [] as string[] },
}));

vi.mock("@/utils/db/exerciseLibrary", () => ({
  listExercisesByPattern: listExercisesByPatternMock,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ clientId: "client-1" }),
}));

vi.mock("@/hooks/useClientEquipment", () => ({
  useClientEquipment: () => ({ data: clientEquipmentRef.current }),
}));

import SwapExerciseSheet from "./SwapExerciseSheet";

// ----------------------------------------------------------------------------

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 1,
    name: "Test",
    nameSr: "Test",
    isSystemExercise: true,
    createdByTrainerId: null,
    movementPattern: "hip_dominant",
    primaryMuscle: "glutes",
    secondaryMuscles: [],
    tensionProfile: "mid_range",
    cnsLoad: 3,
    fatigueIndex: 3,
    equipment: ["barbell"],
    difficulty: "intermediate",
    requiresStabilization: false,
    contraindications: [],
    gentleOn: [],
    weightIncrement: 2.5,
    isBilateral: true,
    videoUrl: null,
    instructions: "",
    isGluteBuilder: false,
    isCompound: true,
    isFinisherEligible: false,
    ...overrides,
  };
}

const FIXTURE: Exercise[] = [
  makeExercise({ id: 11, name: "Barbell Hip Thrust", nameSr: "Barbell Hip Thrust", equipment: ["barbell", "bench"], tensionProfile: "mid_range" }),
  makeExercise({ id: 12, name: "Glute Bridge", nameSr: "Glute Bridge", equipment: ["bodyweight"], tensionProfile: "shortened" }),
  makeExercise({ id: 13, name: "DB RDL", nameSr: "DB RDL", equipment: ["dumbbell"], tensionProfile: "stretch" }),
];

function renderSheet(props?: Partial<React.ComponentProps<typeof SwapExerciseSheet>>) {
  const onPick = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <SwapExerciseSheet
      open
      onOpenChange={onOpenChange}
      movementPattern="hip_dominant"
      muscleGroup="glutes"
      currentExerciseId={null}
      injuries={[]}
      onPick={onPick}
      {...props}
    />,
  );
  return { onPick, onOpenChange };
}

describe("SwapExerciseSheet", () => {
  beforeEach(() => {
    listExercisesByPatternMock.mockReset();
    listExercisesByPatternMock.mockResolvedValue(FIXTURE);
    clientEquipmentRef.current = [];
  });

  afterEach(() => {
    cleanup();
  });

  it("prazan equipment profil → bez filtera, prikazuje sve alternative", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("Barbell Hip Thrust")).toBeInTheDocument();
    });
    expect(screen.getByText("Glute Bridge")).toBeInTheDocument();
    expect(screen.getByText("DB RDL")).toBeInTheDocument();
  });

  it("equipment filter: skriva vežbe bez opreme, bodyweight uvek prolazi", async () => {
    clientEquipmentRef.current = ["Dumbbell"];
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("DB RDL")).toBeInTheDocument();
    });
    expect(screen.getByText("Glute Bridge")).toBeInTheDocument(); // bodyweight
    expect(screen.queryByText("Barbell Hip Thrust")).not.toBeInTheDocument();
  });

  it("rangira po surgical swap scoringu (stretch ispred shortened)", async () => {
    renderSheet();
    await waitFor(() => {
      expect(screen.getByText("DB RDL")).toBeInTheDocument();
    });
    const names = screen
      .getAllByRole("button")
      .map((b) => b.textContent ?? "")
      .filter((tx) => FIXTURE.some((ex) => tx.includes(ex.name)));
    // stretch (DB RDL) > mid_range (Barbell Hip Thrust) > shortened (Glute Bridge)
    expect(names[0]).toContain("DB RDL");
    expect(names[names.length - 1]).toContain("Glute Bridge");
  });

  it("default pick → onPick sa permanent: false", async () => {
    const { onPick } = renderSheet();
    await waitFor(() => {
      expect(screen.getByText("DB RDL")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("DB RDL"));
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 13 }),
      { permanent: false },
    );
  });

  it("'Zameni trajno' toggle → onPick sa permanent: true", async () => {
    const { onPick } = renderSheet();
    await waitFor(() => {
      expect(screen.getByText("DB RDL")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByText("DB RDL"));
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 13 }),
      { permanent: true },
    );
  });

  it("trenutna vežba je isključena iz alternativa", async () => {
    renderSheet({ currentExerciseId: 11 });
    await waitFor(() => {
      expect(screen.getByText("DB RDL")).toBeInTheDocument();
    });
    expect(screen.queryByText("Barbell Hip Thrust")).not.toBeInTheDocument();
  });
});
