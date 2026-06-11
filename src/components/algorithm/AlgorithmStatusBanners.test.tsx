// ============================================================================
// AlgorithmStatusBanners — component testovi
// ============================================================================
//
// Pokriva: prikaz/skrivanje banera po UserStatus stanju + tenant feature
// flagovi (simple mod = nijedan baner, granularno gašenje pojedinih banera).
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Deterministički render — bez framer-motion animacija u jsdom-u
vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

// Tenant feature flagovi — kontrolišemo ih po testu
const { isFeatureEnabledMock } = vi.hoisted(() => ({
  isFeatureEnabledMock: vi.fn<(key: string) => boolean>(() => true),
}));
vi.mock("@/tenant.config", () => ({
  isFeatureEnabled: isFeatureEnabledMock,
}));

import AlgorithmStatusBanners, {
  type AlgorithmStatusInput,
} from "./AlgorithmStatusBanners";

// ----------------------------------------------------------------------------
// Fixture — "mirno" stanje: nijedan baner ne treba da se prikaže
// ----------------------------------------------------------------------------

function makeStatus(
  overrides: Partial<AlgorithmStatusInput> = {},
): AlgorithmStatusInput {
  return {
    currentMicrocycleIndex: 1, // akumulacija (nije W1, overreach ni deload)
    totalWeeksInMesocycle: 7,
    isInDeload: false,
    hasHashimoto: false,
    currentSmartCutStep: 0,
    targetMode: "maintenance",
    activeRefeedDay: false,
    dietBreakActive: false,
    isInReturnFromBreak: false,
    neatDailyAvg: null,
    prefersReducedMotion: true,
    ...overrides,
  };
}

describe("AlgorithmStatusBanners", () => {
  beforeEach(() => {
    // Default: full algoritam — svi flagovi uključeni
    isFeatureEnabledMock.mockReset();
    isFeatureEnabledMock.mockImplementation(() => true);
  });

  afterEach(() => {
    cleanup();
  });

  // --------------------------------------------------------------------------
  // Stanja iz UserStatus-a
  // --------------------------------------------------------------------------

  it("mirno stanje — ne renderuje nijedan baner", () => {
    const { container } = render(<AlgorithmStatusBanners {...makeStatus()} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryAllByRole("status")).toHaveLength(0);
  });

  it("overreach nedelja (pretposlednja) prikazuje 'Najjača nedelja'", () => {
    render(
      <AlgorithmStatusBanners
        {...makeStatus({ currentMicrocycleIndex: 5, totalWeeksInMesocycle: 7 })}
      />,
    );
    expect(screen.getByText("Najjača nedelja")).toBeInTheDocument();
  });

  it("deload nedelja (poslednja) prikazuje 'Lakša nedelja — odmor'", () => {
    render(
      <AlgorithmStatusBanners
        {...makeStatus({ currentMicrocycleIndex: 6, totalWeeksInMesocycle: 7 })}
      />,
    );
    expect(screen.getByText("Lakša nedelja — odmor")).toBeInTheDocument();
  });

  it("return-from-break prikazuje 'Vraćaš se polako'", () => {
    render(
      <AlgorithmStatusBanners {...makeStatus({ isInReturnFromBreak: true })} />,
    );
    expect(screen.getByText("Vraćaš se polako")).toBeInTheDocument();
  });

  it("diet break prikazuje 'Pauza od dijete — 2 nedelje'", () => {
    render(
      <AlgorithmStatusBanners {...makeStatus({ dietBreakActive: true })} />,
    );
    expect(screen.getByText("Pauza od dijete — 2 nedelje")).toBeInTheDocument();
  });

  it("refeed dan prikazuje 'Dan punjenja'", () => {
    render(
      <AlgorithmStatusBanners {...makeStatus({ activeRefeedDay: true })} />,
    );
    expect(screen.getByText("Dan punjenja")).toBeInTheDocument();
  });

  it("Smart Cut step > 0 prikazuje 'Plan se prilagođava' sa labelom za korak", () => {
    render(
      <AlgorithmStatusBanners {...makeStatus({ currentSmartCutStep: 2 })} />,
    );
    expect(screen.getByText("Plan se prilagođava")).toBeInTheDocument();
    expect(
      screen.getByText(/Manje hidrata van treninga/),
    ).toBeInTheDocument();
  });

  it("smartCutPaused ima prioritet nad Smart Cut step banerom", () => {
    render(
      <AlgorithmStatusBanners
        {...makeStatus({ currentSmartCutStep: 2, smartCutPaused: true })}
      />,
    );
    expect(screen.getByText("Pauza u smanjenju")).toBeInTheDocument();
    expect(screen.queryByText("Plan se prilagođava")).not.toBeInTheDocument();
  });

  it("NEAT gate: na deficitu ispod 10k koraka prikazuje 'Hodaj malo više'", () => {
    render(
      <AlgorithmStatusBanners
        {...makeStatus({ targetMode: "deficit", neatDailyAvg: 8000 })}
      />,
    );
    expect(screen.getByText("Hodaj malo više")).toBeInTheDocument();
  });

  it("NEAT gate se NE prikazuje bez podataka, iznad 10k, ili van deficita", () => {
    // Nema podataka (null)
    const { rerender } = render(
      <AlgorithmStatusBanners
        {...makeStatus({ targetMode: "deficit", neatDailyAvg: null })}
      />,
    );
    expect(screen.queryByText("Hodaj malo više")).not.toBeInTheDocument();

    // Iznad gate-a
    rerender(
      <AlgorithmStatusBanners
        {...makeStatus({ targetMode: "deficit", neatDailyAvg: 12000 })}
      />,
    );
    expect(screen.queryByText("Hodaj malo više")).not.toBeInTheDocument();

    // Nije na deficitu/rekompoziciji
    rerender(
      <AlgorithmStatusBanners
        {...makeStatus({ targetMode: "maintenance", neatDailyAvg: 8000 })}
      />,
    );
    expect(screen.queryByText("Hodaj malo više")).not.toBeInTheDocument();
  });

  it("više aktivnih stanja renderuje više banera odjednom", () => {
    render(
      <AlgorithmStatusBanners
        {...makeStatus({
          dietBreakActive: true,
          activeRefeedDay: true,
          chronicHardWorkouts: true,
        })}
      />,
    );
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  // --------------------------------------------------------------------------
  // Tenant feature flagovi (white-label)
  // --------------------------------------------------------------------------

  it("simple mod (svi flagovi false): nijedan baner iako su SVA stanja aktivna", () => {
    isFeatureEnabledMock.mockImplementation(() => false);
    const { container } = render(
      <AlgorithmStatusBanners
        {...makeStatus({
          currentMicrocycleIndex: 5, // overreach
          isInReturnFromBreak: true,
          dietBreakActive: true,
          activeRefeedDay: true,
          currentSmartCutStep: 2,
          smartCutPaused: true,
          waterRetentionAlert: true,
          chronicHardWorkouts: true,
          preWorkoutFatigue: true,
          targetMode: "deficit",
          neatDailyAvg: 5000,
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("granularni flag: gašenje 'mesocycles' skriva mezo baner, ali refeed ostaje", () => {
    isFeatureEnabledMock.mockImplementation((key) => key !== "mesocycles");
    render(
      <AlgorithmStatusBanners
        {...makeStatus({
          currentMicrocycleIndex: 5, // bio bi overreach
          activeRefeedDay: true,
        })}
      />,
    );
    expect(screen.queryByText("Najjača nedelja")).not.toBeInTheDocument();
    expect(screen.getByText("Dan punjenja")).toBeInTheDocument();
  });

  it("granularni flag: gašenje 'biofeedbackRules' skriva fatigue i water-retention banere", () => {
    isFeatureEnabledMock.mockImplementation(
      (key) => key !== "biofeedbackRules",
    );
    render(
      <AlgorithmStatusBanners
        {...makeStatus({
          preWorkoutFatigue: true,
          waterRetentionAlert: true,
          chronicHardWorkouts: true, // domsDetection flag — ostaje uključen
        })}
      />,
    );
    expect(
      screen.queryByText("Lakša sesija — bez forsiranja"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Telo zadržava vodu")).not.toBeInTheDocument();
    expect(screen.getByText("Manje serija ove sesije")).toBeInTheDocument();
  });
});
