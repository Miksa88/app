// ============================================================================
// DailyCheckInSheet — RTL render + submit tests (IT-6)
// ============================================================================
//
// Ova suite je prvi .test.tsx u codebase-u. Koristi @testing-library/react + jsdom
// iz postojećeg vitest setup-a (src/test/setup.ts).
//
// Pokriveni slučajevi (2):
//   1. Render: sheet otvoren, sva polja prisutna, submit disabled dok weight
//      nije valid.
//   2. Submit: popuni weight + promeni water glasses → submit okida
//      useDailyCheckIn.mutate sa ispravnim payload-om (DailyCheckIn shape).
//
// Strategija mocka: vi.mock("@/hooks/mutations/useDailyCheckIn") zamenjuje hook
// fiksnim fake-om koji izlaže `mutate` spy. Jedna jedinicka instanca mocka se
// deli između testova kroz `mockMutation` ref — reset u beforeEach.
//
// LanguageContext je potreban jer DailyCheckInSheet zove useLanguage().t().
// LanguageProvider je čisti React state container (no network), pa ga koristimo
// bez dodatnog mocka.
// ============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { LanguageProvider } from "@/contexts/LanguageContext";

// ----------------------------------------------------------------------------
// Mock useDailyCheckIn — fiksan fake sa spy-evanim mutate
// ----------------------------------------------------------------------------

const mockMutate = vi.fn<[unknown, { onSuccess?: () => void } | undefined], void>();

vi.mock("@/hooks/mutations/useDailyCheckIn", () => ({
  useDailyCheckIn: () => ({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}));

// Mock sonner toast — sheet zove toast.success() na onSuccess; ne treba nam
// realan toast za ove testove.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import AFTER mocks postave (Vite hoist-uje vi.mock, ali explicit redosled
// je čitljiviji).
import { DailyCheckInSheet } from "./DailyCheckInSheet";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function renderSheet(
  props: Partial<React.ComponentProps<typeof DailyCheckInSheet>> = {},
) {
  const onOpenChange = vi.fn();
  const defaultProps = {
    open: true,
    onOpenChange,
    clientId: "client-a",
    cycleTrackingEnabled: false,
    ...props,
  };
  const utils = render(
    <LanguageProvider>
      <DailyCheckInSheet {...defaultProps} />
    </LanguageProvider>,
  );
  return { ...utils, onOpenChange };
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("DailyCheckInSheet", () => {
  beforeEach(() => {
    mockMutate.mockReset();
  });

  it("renders all fields and disables submit until weight is valid", () => {
    renderSheet();

    // Heading (sheet title) je "Morning check-in" (en default — LanguageProvider
    // default language je "en" kad localStorage nema "app-language" ključ).
    expect(screen.getByText(/Morning check-in/i)).toBeInTheDocument();

    // Polja — weight, sleep, stress grupa, energy, water stepper
    expect(screen.getByLabelText(/Weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sleep/i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByLabelText(/Energy/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Add a glass of water/i)).toBeInTheDocument();

    // cycleTrackingEnabled=false → cycle day polje NIJE prikazano
    expect(screen.queryByLabelText(/Cycle day/i)).not.toBeInTheDocument();

    // Submit dugme disabled dok weight nije unet (Button ima disabled atribut
    // i role="button" sa aria-disabled true bi bilo pogrešno — koristimo disabled
    // property kroz toBeDisabled matcher iz jest-dom).
    const submitBtn = screen.getByRole("button", { name: /Save check-in/i });
    expect(submitBtn).toBeDisabled();
  });

  it("calls mutate with correct DailyCheckIn payload on submit", () => {
    renderSheet({ clientId: "client-a" });

    // Unesi valjanu težinu (62.4 kg)
    const weightInput = screen.getByLabelText(/Weight/i) as HTMLInputElement;
    fireEvent.change(weightInput, { target: { value: "62.4" } });

    // +1 čaša vode (stepper) → waterIntakeMl treba da bude 250
    const addWaterBtn = screen.getByLabelText(/Add a glass of water/i);
    fireEvent.click(addWaterBtn);

    // Submit
    const submitBtn = screen.getByRole("button", { name: /Save check-in/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    // Assert mutate pozvan jednom sa ispravnim payload-om
    expect(mockMutate).toHaveBeenCalledTimes(1);
    const [payload, options] = mockMutate.mock.calls[0];
    const checkIn = payload as {
      clientId: string;
      weightKg: number;
      sleepHours: number;
      stressLevel: number;
      energyLevel: number;
      waterIntakeMl: number;
      cycleDay?: number;
      date: Date;
    };
    expect(checkIn.clientId).toBe("client-a");
    expect(checkIn.weightKg).toBeCloseTo(62.4, 2);
    expect(checkIn.sleepHours).toBe(7.5); // default
    expect(checkIn.stressLevel).toBe(3); // default
    expect(checkIn.energyLevel).toBe(7); // default
    expect(checkIn.waterIntakeMl).toBe(250); // 1 čaša × 250 ml
    // cycleTrackingEnabled=false → cycleDay NIJE u payload-u
    expect(checkIn.cycleDay).toBeUndefined();
    // date je set na `new Date()` u trenutku submita
    expect(checkIn.date).toBeInstanceOf(Date);
    // options.onSuccess callback postoji (komponenta ga postavlja za confetti+toast)
    expect(options?.onSuccess).toBeTypeOf("function");
  });
});
