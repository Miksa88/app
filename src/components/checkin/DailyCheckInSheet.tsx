// ============================================================================
// DailyCheckInSheet — morning check-in BottomSheet (IT-6)
// Spec: 02_NUTRITION_FLOW_MASTER.md §13 (Daily logging)
//       03_INTEGRATION_LAYER.md §3.1 (DailyCheckIn flow)
// ============================================================================
//
// UI ulaz za dnevni check-in. Kada klijentkinja unese podatke:
//   1. useDailyCheckIn(clientId).mutate(checkIn)
//   2. Na success: zatvori sheet, pusti ConfettiCelebration, toast.success
//   3. Realtime push od save-user-status EF-a će osvežiti Home preko useUserStatus
//
// Design discipline:
//   - BottomSheet pattern (iOS handle bar + rounded top)
//   - Tap targets >= 44×44pt (Input min-h-11, Button size="lg"/xl)
//   - Motion koristi shouldReduceMotion() preko <ConfettiCelebration>
//   - Samo CSS tokens — nijedan hardcoded hex
//   - Copy kroz t() — zero-guilt (nikad "propušteno/kasniš/moraš")
//
// Biology discipline:
//   - Cycle day VIDLJIV samo ako tracker aktivan (status.bio.cycleDay ili
//     status.bio.cyclePhase nije null — signal da profile.cycleTrackingEnabled=true)
//   - Stress 1–5 segmented labels: Opušteno → Intenzivno (bez stigmatizacije)
//   - Water +/- stepper, 1 čaša = 250 ml
// ============================================================================

import { useState } from "react";
import { Moon, Activity, Sparkles, Droplets, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";

import { useDailyCheckIn } from "@/hooks/mutations/useDailyCheckIn";
import { useLanguage } from "@/contexts/LanguageContext";

import type { DailyCheckIn } from "@/types/nutrition";

// ============================================================================
// Constants
// ============================================================================

/** 1 čaša = 250 ml (spec-uskladjeno sa Home water widget-om). */
export const ML_PER_GLASS = 250;

/** Cycle day opseg — 1 do 45 (dugi ciklusi su realni, PCOS klijentkinje). */
const CYCLE_DAY_MIN = 1;
const CYCLE_DAY_MAX = 45;

/** Realistični weight bounds (isti kao validation u process-daily-check-in EF). */
const WEIGHT_KG_MIN = 20;
const WEIGHT_KG_MAX = 300;

// ============================================================================
// Props
// ============================================================================

export interface DailyCheckInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Trenutni clientId — koristi se za mutation hook */
  clientId: string;
  /**
   * Da li je cycle tracking uključen za ovog korisnika.
   * Deriv iz `useUserStatus` → `status.bio.cycleDay !== null || status.bio.cyclePhase !== null`
   * (presence indicators — profile.cycleTrackingEnabled prepisuje ih u status bio).
   */
  cycleTrackingEnabled?: boolean;
  /** Opcionalni pre-fill cycleDay — npr. ako Home već zna current cycle day */
  initialCycleDay?: number | null;
}

// ============================================================================
// Component
// ============================================================================

export function DailyCheckInSheet({
  open,
  onOpenChange,
  clientId,
  cycleTrackingEnabled = false,
  initialCycleDay = null,
}: DailyCheckInSheetProps) {
  const { t } = useLanguage();
  const mutation = useDailyCheckIn(clientId);

  // Form state — weight je obavezno, ostalo ima razumne defaults (zero-guilt UX).
  const [weightStr, setWeightStr] = useState<string>("");
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [stressLevel, setStressLevel] = useState<number>(3);
  const [energyLevel, setEnergyLevel] = useState<number>(7);
  const [waterGlasses, setWaterGlasses] = useState<number>(0);
  const [cycleDayStr, setCycleDayStr] = useState<string>(
    initialCycleDay !== null ? String(initialCycleDay) : "",
  );
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  // Validation — weightKg je jedina obavezna vrednost (ostala polja imaju
  // smislene defaults). Zero-guilt: ne blokiramo user-a zbog sporednih polja.
  const weightKg = parseFloat(weightStr.replace(",", "."));
  const isWeightValid =
    !Number.isNaN(weightKg) &&
    weightKg >= WEIGHT_KG_MIN &&
    weightKg <= WEIGHT_KG_MAX;

  const cycleDayNum = cycleDayStr.trim() === "" ? null : parseInt(cycleDayStr, 10);
  const isCycleDayValid =
    cycleDayNum === null ||
    (Number.isFinite(cycleDayNum) &&
      cycleDayNum >= CYCLE_DAY_MIN &&
      cycleDayNum <= CYCLE_DAY_MAX);

  const canSubmit = isWeightValid && isCycleDayValid && !mutation.isPending;

  const resetForm = () => {
    setWeightStr("");
    setSleepHours(7.5);
    setStressLevel(3);
    setEnergyLevel(7);
    setWaterGlasses(0);
    setCycleDayStr("");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const checkIn: DailyCheckIn = {
      clientId,
      date: new Date(),
      weightKg,
      sleepHours,
      stressLevel,
      energyLevel,
      waterIntakeMl: waterGlasses * ML_PER_GLASS,
      // cycleDay je opcionalno — prosledi samo ako je tracker aktivan i user uneo
      ...(cycleTrackingEnabled && cycleDayNum !== null
        ? { cycleDay: cycleDayNum }
        : {}),
    };

    mutation.mutate(checkIn, {
      onSuccess: () => {
        // Celebrate — confetti + toast, pa zatvori sheet i resetuj formu
        setShowConfetti(true);
        toast.success(t("checkin.successToast"), {
          description: t("checkin.successDesc"),
        });
        // Realtime push od save-user-status EF-a osvežava useUserStatus
        onOpenChange(false);
        resetForm();
        // Confetti se auto-demount-uje kad se overlay ukloni; setuj false posle
        // kratke pauze da particle animacije zavrse (2.5–4.5s)
        window.setTimeout(() => setShowConfetti(false), 3500);
      },
      // onError: toast već throw-a hook sa korisnom porukom; ne diramo formu
      // (user može da retry-uje bez ponovnog unosa)
    });
  };

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={t("checkin.title")}
        description={t("checkin.subtitle")}
        maxHeight="90vh"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-6 pb-6"
        >
          {/* Weight ============================================== */}
          <Field
            label={t("checkin.fields.weight")}
            htmlFor="checkin-weight"
            unit={t("checkin.fields.weightUnit")}
            required
          >
            <Input
              id="checkin-weight"
              name="weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={t("checkin.fields.weightPlaceholder")}
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              aria-invalid={weightStr !== "" && !isWeightValid}
              aria-required
            />
          </Field>

          {/* Sleep hours (slider 0–12) =========================== */}
          <Field
            label={t("checkin.fields.sleep")}
            htmlFor="checkin-sleep"
            icon={<Moon className="text-info" aria-hidden="true" />}
            valueDisplay={`${formatHours(sleepHours)} ${t("checkin.fields.sleepUnit")}`}
          >
            <Slider
              id="checkin-sleep"
              min={0}
              max={12}
              step={0.5}
              value={[sleepHours]}
              onValueChange={(vals) => setSleepHours(vals[0] ?? 0)}
              aria-label={t("checkin.fields.sleep")}
            />
          </Field>

          {/* Stress (1–5 segmented) ============================== */}
          <Field
            label={t("checkin.fields.stress")}
            icon={<Activity className="text-warning" aria-hidden="true" />}
          >
            <StressSegmented
              value={stressLevel}
              onChange={setStressLevel}
              labelFor={(n) => t(`checkin.stress.${n}`)}
            />
          </Field>

          {/* Energy (1–10 slider) ================================ */}
          <Field
            label={t("checkin.fields.energy")}
            htmlFor="checkin-energy"
            icon={<Sparkles className="text-success" aria-hidden="true" />}
            valueDisplay={`${energyLevel} / 10`}
          >
            <Slider
              id="checkin-energy"
              min={1}
              max={10}
              step={1}
              value={[energyLevel]}
              onValueChange={(vals) => setEnergyLevel(vals[0] ?? 1)}
              aria-label={t("checkin.fields.energy")}
            />
          </Field>

          {/* Water (+/- stepper) ================================= */}
          <Field
            label={t("checkin.fields.water")}
            icon={<Droplets className="text-info" aria-hidden="true" />}
          >
            <WaterStepper
              glasses={waterGlasses}
              onChange={setWaterGlasses}
              decrementLabel={t("a11y.waterRemove")}
              incrementLabel={t("a11y.waterAdd")}
              unit={t("checkin.fields.waterUnit")}
            />
          </Field>

          {/* Cycle day (conditional) ============================= */}
          {cycleTrackingEnabled && (
            <Field
              label={t("checkin.fields.cycleDay")}
              htmlFor="checkin-cycle-day"
            >
              <Input
                id="checkin-cycle-day"
                name="cycleDay"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t("checkin.fields.cycleDayPlaceholder")}
                value={cycleDayStr}
                onChange={(e) => setCycleDayStr(e.target.value)}
                aria-invalid={cycleDayStr !== "" && !isCycleDayValid}
              />
            </Field>
          )}

          {/* Submit ============================================== */}
          <Button
            type="submit"
            variant="cta"
            size="xl"
            disabled={!canSubmit}
            aria-busy={mutation.isPending}
            className="mt-2"
          >
            {mutation.isPending
              ? t("checkin.submitting")
              : t("checkin.submit")}
          </Button>
        </form>
      </BottomSheet>

      {/* Confetti burst (fixed overlay, ignores reduce-motion internally) */}
      {showConfetti && (
        <div
          className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
          aria-hidden="true"
        >
          <ConfettiCelebration count={32} delayMax={0.5} />
        </div>
      )}
    </>
  );
}

// ============================================================================
// Field — label + icon + value display + child control
// ============================================================================

interface FieldProps {
  label: string;
  htmlFor?: string;
  icon?: React.ReactNode;
  unit?: string;
  valueDisplay?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({
  label,
  htmlFor,
  icon,
  unit,
  valueDisplay,
  required,
  children,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label
          htmlFor={htmlFor}
          className="text-subhead font-semibold text-foreground flex items-center gap-2"
        >
          {icon && (
            <span className="inline-flex items-center justify-center w-5 h-5">
              {icon}
            </span>
          )}
          <span>
            {label}
            {required && (
              <span className="text-destructive ml-0.5" aria-hidden="true">
                *
              </span>
            )}
            {unit && (
              <span className="text-muted-foreground font-normal ml-1">
                ({unit})
              </span>
            )}
          </span>
        </Label>
        {valueDisplay && (
          <span className="text-footnote font-semibold text-foreground tabular-nums">
            {valueDisplay}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// StressSegmented — 1–5 radio-like segmented control
// ============================================================================

interface StressSegmentedProps {
  value: number;
  onChange: (v: number) => void;
  labelFor: (n: number) => string;
}

function StressSegmented({ value, onChange, labelFor }: StressSegmentedProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Stress level"
      className="grid grid-cols-5 gap-2"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const isActive = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(n)}
            className={`min-h-11 rounded-xl px-2 py-2 text-caption-1 font-semibold transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-foreground hover:bg-muted"
            }`}
          >
            <span className="block text-footnote font-bold tabular-nums">
              {n}
            </span>
            <span className="block text-caption-2 opacity-80 mt-0.5">
              {labelFor(n)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// WaterStepper — +/- 250ml čaša counter
// ============================================================================

interface WaterStepperProps {
  glasses: number;
  onChange: (n: number) => void;
  decrementLabel: string;
  incrementLabel: string;
  unit: string;
}

function WaterStepper({
  glasses,
  onChange,
  decrementLabel,
  incrementLabel,
  unit,
}: WaterStepperProps) {
  const atMin = glasses <= 0;
  const atMax = glasses >= 20;
  return (
    <div className="flex items-center justify-center gap-6">
      <Button
        type="button"
        variant="outline"
        size="icon-round"
        onClick={() => onChange(Math.max(0, glasses - 1))}
        disabled={atMin}
        aria-label={decrementLabel}
      >
        <Minus aria-hidden="true" />
      </Button>
      <div className="text-center min-w-20">
        <p className="text-title-2 font-bold text-foreground tabular-nums leading-none">
          {glasses}
        </p>
        <p className="text-caption-1 text-muted-foreground mt-1">
          {unit} · {glasses * ML_PER_GLASS} ml
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-round"
        onClick={() => onChange(Math.min(20, glasses + 1))}
        disabled={atMax}
        aria-label={incrementLabel}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatHours(h: number): string {
  // 7.5 → "7.5", 8 → "8" (nema ružnog ".0")
  return Number.isInteger(h) ? String(h) : h.toFixed(1);
}

export default DailyCheckInSheet;
