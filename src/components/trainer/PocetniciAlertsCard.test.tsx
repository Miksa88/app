// ============================================================================
// PocetniciAlertsCard — component testovi
// ============================================================================
//
// Pokriva: empty state, render crvenog/žutog alerta (badge, title,
// description, recommended actions) i listu od više alert-a.
// ============================================================================

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

import PocetniciAlertsCard from "./PocetniciAlertsCard";
import type { PocetniciAlert } from "@/utils/sync/pocetniciAlerts";

// ----------------------------------------------------------------------------

function makeAlert(overrides: Partial<PocetniciAlert> = {}): PocetniciAlert {
  return {
    id: "alert-1",
    severity: "red",
    title: "Tri propuštene sesije",
    description: "Klijentkinja je propustila 3 treninga zaredom.",
    recommendedActions: ["Pozovi klijentkinju", "Smanji volumen za 20%"],
    ...overrides,
  };
}

describe("PocetniciAlertsCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("bez alert-a prikazuje empty state poruku", () => {
    render(<PocetniciAlertsCard alerts={[]} />);

    expect(screen.getByText(/Nema aktivnih §8 alert-a/)).toBeInTheDocument();
    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });

  it("crveni alert: title, description, CRVENO badge i akcije", () => {
    const alert = makeAlert();
    render(<PocetniciAlertsCard alerts={[alert]} prefersReducedMotion />);

    expect(
      screen.getByRole("region", { name: alert.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(alert.description)).toBeInTheDocument();
    expect(screen.getByText("CRVENO")).toBeInTheDocument();
    expect(screen.queryByText("ŽUTO")).not.toBeInTheDocument();
    // Sve preporučene akcije su izlistane
    expect(screen.getByText("Pozovi klijentkinju")).toBeInTheDocument();
    expect(screen.getByText("Smanji volumen za 20%")).toBeInTheDocument();
  });

  it("amber alert: ŽUTO badge umesto CRVENO", () => {
    render(
      <PocetniciAlertsCard
        alerts={[
          makeAlert({
            id: "alert-amber",
            severity: "amber",
            title: "Nizak san 3 noći",
          }),
        ]}
        prefersReducedMotion
      />,
    );

    expect(screen.getByText("ŽUTO")).toBeInTheDocument();
    expect(screen.queryByText("CRVENO")).not.toBeInTheDocument();
  });

  it("više alert-a renderuje sve kao zasebne regione", () => {
    render(
      <PocetniciAlertsCard
        alerts={[
          makeAlert({ id: "a1", title: "Alert jedan" }),
          makeAlert({ id: "a2", severity: "amber", title: "Alert dva" }),
          makeAlert({ id: "a3", title: "Alert tri" }),
        ]}
        prefersReducedMotion
      />,
    );

    expect(screen.getAllByRole("region")).toHaveLength(3);
    expect(screen.getByText("Alert jedan")).toBeInTheDocument();
    expect(screen.getByText("Alert dva")).toBeInTheDocument();
    expect(screen.getByText("Alert tri")).toBeInTheDocument();
  });

  it("alert bez preporučenih akcija renderuje praznu checklistu bez pucanja", () => {
    render(
      <PocetniciAlertsCard
        alerts={[makeAlert({ recommendedActions: [] })]}
        prefersReducedMotion
      />,
    );

    expect(screen.getByText("CRVENO")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
