// ============================================================================
// PreWorkoutFatigueDialog — component testovi
// ============================================================================
//
// Pokriva: render pitanja (i18n preko LanguageProvider, default EN),
// optimističko zatvaranje (klik → onAnswered + onOpenChange(false) ODMAH,
// save u pozadini), onSaved posle uspešnog snimanja, error putanju
// (toast, dijalog je već zatvoren) i guard protiv duplog tap-a.
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";

import { LanguageProvider } from "@/contexts/LanguageContext";

vi.mock("framer-motion", () => import("@/test/mocks/framer-motion"));

const { saveFatigueSignalMock, toastErrorMock } = vi.hoisted(() => ({
  saveFatigueSignalMock: vi.fn<
    (clientId: string, fatigued: boolean) => Promise<void>
  >(() => Promise.resolve()),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/services/biofeedbackService", () => ({
  saveFatigueSignal: saveFatigueSignalMock,
}));

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: vi.fn() },
}));

import PreWorkoutFatigueDialog from "./PreWorkoutFatigueDialog";

// ----------------------------------------------------------------------------

function renderDialog(open = true) {
  const onOpenChange = vi.fn();
  const onAnswered = vi.fn();
  const onSaved = vi.fn();

  render(
    <LanguageProvider>
      <PreWorkoutFatigueDialog
        open={open}
        onOpenChange={onOpenChange}
        clientId="client-1"
        onAnswered={onAnswered}
        onSaved={onSaved}
      />
    </LanguageProvider>,
  );

  return { onOpenChange, onAnswered, onSaved };
}

describe("PreWorkoutFatigueDialog", () => {
  beforeEach(() => {
    saveFatigueSignalMock.mockReset();
    saveFatigueSignalMock.mockImplementation(() => Promise.resolve());
    toastErrorMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("open=true renderuje pitanje i obe opcije (i18n, default EN)", () => {
    renderDialog();

    expect(screen.getByText("How are you feeling?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tired — lighter workout today/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Rested — standard workout/ }),
    ).toBeInTheDocument();
  });

  it("open=false ne renderuje sadržaj", () => {
    renderDialog(false);
    expect(screen.queryByText("How are you feeling?")).not.toBeInTheDocument();
  });

  it("'Umorna' zatvara ODMAH (optimistički), snima fatigued=true u pozadini i zove onSaved", async () => {
    const { onAnswered, onOpenChange, onSaved } = renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: /Tired — lighter workout today/ }),
    );

    // Optimistički: callback-ovi se zovu sinhrono, ne čeka se mreža
    expect(onAnswered).toHaveBeenCalledWith(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(saveFatigueSignalMock).toHaveBeenCalledWith("client-1", true);

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("'Odmorna' snima fatigued=false i zove onAnswered(false)", async () => {
    const { onAnswered, onOpenChange, onSaved } = renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: /Rested — standard workout/ }),
    );

    expect(onAnswered).toHaveBeenCalledWith(false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(saveFatigueSignalMock).toHaveBeenCalledWith("client-1", false);
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it("greška pri snimanju: dijalog je već zatvoren (optimistički), toast.error, onSaved se NE zove", async () => {
    saveFatigueSignalMock.mockImplementation(() =>
      Promise.reject(new Error("Mreža pukla")),
    );
    const { onAnswered, onOpenChange, onSaved } = renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: /Tired — lighter workout today/ }),
    );

    // Optimistički UX: zatvaranje i onAnswered se dese i pre greške
    expect(onAnswered).toHaveBeenCalledWith(true);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith("Mreža pukla"),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("dupli klik ne snima dvaput (answered guard)", async () => {
    let resolveSave: () => void = () => {};
    saveFatigueSignalMock.mockImplementation(
      () => new Promise<void>((res) => (resolveSave = res)),
    );
    const { onAnswered } = renderDialog();

    const btn = screen.getByRole("button", {
      name: /Tired — lighter workout today/,
    });
    fireEvent.click(btn);
    fireEvent.click(btn); // drugi klik dok prvi traje

    resolveSave();
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1));
    expect(saveFatigueSignalMock).toHaveBeenCalledTimes(1);
  });
});
