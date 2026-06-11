// ============================================================================
// PreWorkoutFatigueDialog — component testovi
// ============================================================================
//
// Pokriva: render pitanja, izbor "Umorna"/"Odmorna" → saveFatigueSignal +
// onAnswered callback + zatvaranje, i error putanju (toast, dijalog ostaje).
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";

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

  render(
    <PreWorkoutFatigueDialog
      open={open}
      onOpenChange={onOpenChange}
      clientId="client-1"
      onAnswered={onAnswered}
    />,
  );

  return { onOpenChange, onAnswered };
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

  it("open=true renderuje pitanje i obe opcije", () => {
    renderDialog();

    expect(screen.getByText("Kako se osećaš?")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Umorna — lakši trening danas/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Odmorna — standardni trening/ }),
    ).toBeInTheDocument();
  });

  it("open=false ne renderuje sadržaj", () => {
    renderDialog(false);
    expect(screen.queryByText("Kako se osećaš?")).not.toBeInTheDocument();
  });

  it("'Umorna' snima fatigued=true, zove onAnswered(true) i zatvara dijalog", async () => {
    const { onAnswered, onOpenChange } = renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: /Umorna — lakši trening danas/ }),
    );

    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith(true));
    expect(saveFatigueSignalMock).toHaveBeenCalledWith("client-1", true);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("'Odmorna' snima fatigued=false i zove onAnswered(false)", async () => {
    const { onAnswered, onOpenChange } = renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: /Odmorna — standardni trening/ }),
    );

    await waitFor(() => expect(onAnswered).toHaveBeenCalledWith(false));
    expect(saveFatigueSignalMock).toHaveBeenCalledWith("client-1", false);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("greška pri snimanju: toast.error, dijalog ostaje otvoren, onAnswered se NE zove", async () => {
    saveFatigueSignalMock.mockImplementation(() =>
      Promise.reject(new Error("Mreža pukla")),
    );
    const { onAnswered, onOpenChange } = renderDialog();

    fireEvent.click(
      screen.getByRole("button", { name: /Umorna — lakši trening danas/ }),
    );

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith("Mreža pukla"),
    );
    expect(onAnswered).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    // Posle greške dugmad su ponovo aktivna (submitting reset)
    expect(
      screen.getByRole("button", { name: /Umorna — lakši trening danas/ }),
    ).toBeEnabled();
  });

  it("dupli klik ne snima dvaput (submitting guard)", async () => {
    // Drži promise pending dok ne kliknemo drugi put
    let resolveSave: () => void = () => {};
    saveFatigueSignalMock.mockImplementation(
      () => new Promise<void>((res) => (resolveSave = res)),
    );
    const { onAnswered } = renderDialog();

    const btn = screen.getByRole("button", {
      name: /Umorna — lakši trening danas/,
    });
    fireEvent.click(btn);
    fireEvent.click(btn); // drugi klik dok prvi traje

    resolveSave();
    await waitFor(() => expect(onAnswered).toHaveBeenCalledTimes(1));
    expect(saveFatigueSignalMock).toHaveBeenCalledTimes(1);
  });
});
