// ============================================================================
// PocetniciAlertsCard — component testovi
// ============================================================================
//
// Pokriva: empty state, render crvenog/žutog alerta (badge, title,
// description, recommended actions) i listu od više alert-a.
// ============================================================================

import { describe, it, expect, vi, afterEach } from "vitest";
import { render as rtlRender, screen, cleanup } from "@testing-library/react";
import type { ReactElement } from "react";

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

import PocetniciAlertsCard from "./PocetniciAlertsCard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { PocetniciAlert } from "@/utils/sync/pocetniciAlerts";

// Komponenta sad ide kroz t() — render uvek sa LanguageProvider-om
// (default jezik iz tenant configa = en, pa assertions koriste en stringove).
function render(ui: ReactElement) {
  return rtlRender(<LanguageProvider>{ui}</LanguageProvider>);
}

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

    expect(screen.getByText(/No active §8 alerts/)).toBeInTheDocument();
    expect(screen.queryAllByRole("region")).toHaveLength(0);
  });

  it("crveni alert: title, description, RED badge i akcije", () => {
    const alert = makeAlert();
    render(<PocetniciAlertsCard alerts={[alert]} prefersReducedMotion />);

    expect(
      screen.getByRole("region", { name: alert.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(alert.description)).toBeInTheDocument();
    expect(screen.getByText("RED")).toBeInTheDocument();
    expect(screen.queryByText("AMBER")).not.toBeInTheDocument();
    // Sve preporučene akcije su izlistane
    expect(screen.getByText("Pozovi klijentkinju")).toBeInTheDocument();
    expect(screen.getByText("Smanji volumen za 20%")).toBeInTheDocument();
  });

  it("amber alert: AMBER badge umesto RED", () => {
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

    expect(screen.getByText("AMBER")).toBeInTheDocument();
    expect(screen.queryByText("RED")).not.toBeInTheDocument();
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

    expect(screen.getByText("RED")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
