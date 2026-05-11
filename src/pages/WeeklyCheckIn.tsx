// ============================================================================
// WeeklyCheckIn — nedeljni check-in forma (IT-17)
// Spec: 02_NUTRITION_FLOW_MASTER.md §10 (Weekly + trendline)
//       RALPH_PLAN.md IT-17
// ============================================================================
//
// Forma:
//   - Weight (kg, auto-prefill iz poslednjih 3 dana avg)
//   - Waist / Hip / Thigh cm (opcioni)
//   - Energy 1–10 slider
//   - Identity score 1–5 segmented radiogroup
//   - Notes textarea
//
// Submit:
//   - Posalje na process-weekly-check-in Edge Function
//   - Server pokrene trendline adaptaciju (skipuje menstrualnu fazu)
//   - onSuccess: confetti + navigate natrag na Home
//
// Auto-prefill:
//   - Učitava weight_logs za poslednjih 3 dana direktno iz Supabase klijenta
//     (RLS dozvoljava klijentkinji da čita svoje). Avg se postavlja u weight
//     polje. Korisnica može da pregazi unos.
//
// Biology discipline:
//   - Weight validation 20–300 kg (isto kao EF + DailyCheckIn)
//   - Zero-guilt copy: "Ova nedelja", "Kako je prošlo" — nikad "propušteno/kasniš".
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/PageHeader';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { ConfettiCelebration } from '@/components/ConfettiCelebration';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHaptic } from '@/hooks/useHaptic';
import { useWeeklyCheckIn } from '@/hooks/mutations/useWeeklyCheckIn';
import { usePreferredUnits } from '@/hooks/useUserPreferences';
import {
  cmToIn,
  inToCm,
  kgToLb,
  lbToKg,
  DEFAULT_UNITS,
} from '@/services/userPreferencesService';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Constants
// ============================================================================

const WEIGHT_KG_MIN = 20;
const WEIGHT_KG_MAX = 300;
const MEASUREMENT_CM_MIN = 20;
const MEASUREMENT_CM_MAX = 200;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Vraća YYYY-MM-DD za ponedeljak koji započinje nedelju u kojoj je `date`.
 * ISO: ponedeljak = 1, nedelja = 7. U JS `getDay()`: ned = 0, pon = 1.
 */
function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const jsDay = d.getDay(); // 0 (ned) .. 6 (sub)
  const diff = jsDay === 0 ? -6 : 1 - jsDay; // do ponedeljka
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDecimal(str: string): number | null {
  const trimmed = str.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

// ============================================================================
// Component
// ============================================================================

export default function WeeklyCheckIn() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const haptic = useHaptic();
  const mutation = useWeeklyCheckIn(clientId);
  const { data: units = DEFAULT_UNITS } = usePreferredUnits(clientId);
  const isLb = units.weight === 'lb';
  const isInch = units.length === 'in';
  const weightUnitLabel = isLb ? 'lb' : 'kg';
  const lengthUnitLabel = isInch ? 'in' : 'cm';

  // Forma state
  const [weightStr, setWeightStr] = useState<string>('');
  const [waistStr, setWaistStr] = useState<string>('');
  const [hipStr, setHipStr] = useState<string>('');
  const [thighStr, setThighStr] = useState<string>('');
  const [lastKnownWeight, setLastKnownWeight] = useState<string>('');
  const [energyAvg, setEnergyAvg] = useState<number>(7);
  const [identityScore, setIdentityScore] = useState<number>(4);
  // Recovery inputs (recoveryMultiplier feeder — bez ovog su statični posle onboardinga)
  const [sleepHoursAvg, setSleepHoursAvg] = useState<number>(7);
  const [stressAvg, setStressAvg] = useState<number>(3);
  // Biofeedback (pocetnici.md §4.3) — libido pad → STOP Smart Cut;
  // water retention >7 → waterRetentionAlert
  const [libidoScore, setLibidoScore] = useState<number>(7);
  const [waterRetentionScore, setWaterRetentionScore] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');

  const [prefillLoading, setPrefillLoading] = useState<boolean>(true);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const weekStartDate = mondayOfWeek(new Date());

  // ============================================================================
  // Auto-prefill weight iz poslednjih 3 dana weight_logs
  // ============================================================================
  useEffect(() => {
    let cancelled = false;

    async function loadPrefill() {
      if (!clientId) {
        setPrefillLoading(false);
        return;
      }
      try {
        const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
        const { data, error } = await supabase
          .from('weight_logs')
          .select('weight_kg, logged_at')
          .eq('user_id', clientId)
          .gte('logged_at', threeDaysAgo)
          .order('logged_at', { ascending: false })
          .limit(10);

        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setPrefillLoading(false);
          return;
        }

        const values = data
          .map((r) => Number(r.weight_kg))
          .filter((v) => Number.isFinite(v));
        if (values.length === 0) {
          setPrefillLoading(false);
          return;
        }

        const avgKg = values.reduce((a, b) => a + b, 0) / values.length;
        const avgInDisplayUnit = isLb ? kgToLb(avgKg) : avgKg;
        const rounded = Math.round(avgInDisplayUnit * 10) / 10;
        const roundedStr = String(rounded);
        setLastKnownWeight(roundedStr);
        if (weightStr === '') {
          setWeightStr(roundedStr);
        }
      } catch {
        // Silent — prefill je nice-to-have, ne blokira formu
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    }

    void loadPrefill();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // ============================================================================
  // Validation — value entered in user-preferred unit, converted to canonical
  // (kg / cm) before validation + DB persist.
  // ============================================================================
  const weightInput = parseDecimal(weightStr);
  const weightKg = weightInput === null ? null : isLb ? lbToKg(weightInput) : weightInput;
  const measurementInputToCm = (str: string): number | null => {
    const v = parseDecimal(str);
    if (v === null) return null;
    return isInch ? inToCm(v) : v;
  };
  const waistCm = measurementInputToCm(waistStr);
  const hipCm = measurementInputToCm(hipStr);
  const thighCm = measurementInputToCm(thighStr);

  const isWeightValid =
    weightKg !== null && weightKg >= WEIGHT_KG_MIN && weightKg <= WEIGHT_KG_MAX;

  const isMeasurementValid = (v: number | null): boolean =>
    v === null ||
    (Number.isFinite(v) && v >= MEASUREMENT_CM_MIN && v <= MEASUREMENT_CM_MAX);

  const canSubmit =
    isWeightValid &&
    isMeasurementValid(waistCm) &&
    isMeasurementValid(hipCm) &&
    isMeasurementValid(thighCm) &&
    !mutation.isPending &&
    !!clientId;

  // ============================================================================
  // Submit
  // ============================================================================
  const handleSubmit = () => {
    if (!canSubmit || !clientId || weightKg === null) return;
    haptic('light');

    mutation.mutate(
      {
        weekStartDate,
        weightAvgKg: weightKg,
        waistCm: waistCm,
        hipCm: hipCm,
        thighCm: thighCm,
        energyAvg,
        identityScore,
        sleepHoursAvg,
        stressAvg,
        libidoScore,
        waterRetentionScore,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          setShowConfetti(true);
          toast.success(t('weeklyCheckIn.successToast'), {
            description: t('weeklyCheckIn.successDesc'),
          });
          window.setTimeout(() => {
            setShowConfetti(false);
            navigate('/home');
          }, 1400);
        },
      },
    );
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageHeader onBack={() => navigate(-1)} />

      <PageTitle title={t('weeklyCheckIn.title')} subtitle={t('weeklyCheckIn.subtitle')} compact />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="px-5 mt-6 flex flex-col gap-6"
      >
        {/* Weight ============================================================ */}
        <Card className="p-5">
          <SectionLabel>{t('weeklyCheckIn.sections.weight')}</SectionLabel>
          <div className="flex flex-col gap-2 mt-3">
            <Label
              htmlFor="weekly-weight"
              className="text-subhead font-semibold text-foreground"
            >
              {t('weeklyCheckIn.fields.weight')}{' '}
              <span className="text-muted-foreground font-normal">
                ({weightUnitLabel})
              </span>
            </Label>
            <Input
              id="weekly-weight"
              name="weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={
                prefillLoading
                  ? t('weeklyCheckIn.fields.weightLoading')
                  : t('weeklyCheckIn.fields.weightPlaceholder')
              }
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              aria-invalid={weightStr !== '' && !isWeightValid}
            />
            <p className="text-caption-1 text-muted-foreground">
              {t('weeklyCheckIn.fields.weightHint')}
            </p>
            {lastKnownWeight && weightStr !== lastKnownWeight && (
              <button
                type="button"
                onClick={() => setWeightStr(lastKnownWeight)}
                className="self-start text-caption-1 text-primary font-medium underline underline-offset-2 min-h-9"
              >
                {t('weeklyCheckIn.skipWeight')} ({lastKnownWeight}{weightUnitLabel})
              </button>
            )}
          </div>
        </Card>

        {/* Measurements (optional) =========================================== */}
        <Card className="p-5">
          <SectionLabel>{t('weeklyCheckIn.sections.measurements')}</SectionLabel>
          <p className="text-caption-1 text-muted-foreground mt-1">
            {t('weeklyCheckIn.sections.measurementsHint')}
          </p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <MeasurementField
              id="weekly-waist"
              label={t('weeklyCheckIn.fields.waist')}
              unit={lengthUnitLabel}
              value={waistStr}
              onChange={setWaistStr}
              invalid={waistStr !== '' && !isMeasurementValid(waistCm)}
            />
            <MeasurementField
              id="weekly-hip"
              label={t('weeklyCheckIn.fields.hip')}
              unit={lengthUnitLabel}
              value={hipStr}
              onChange={setHipStr}
              invalid={hipStr !== '' && !isMeasurementValid(hipCm)}
            />
            <MeasurementField
              id="weekly-thigh"
              label={t('weeklyCheckIn.fields.thigh')}
              unit={lengthUnitLabel}
              value={thighStr}
              onChange={setThighStr}
              invalid={thighStr !== '' && !isMeasurementValid(thighCm)}
            />
          </div>
        </Card>

        {/* Energy + Identity ================================================= */}
        <Card className="p-5">
          <SectionLabel>{t('weeklyCheckIn.sections.howYouFeel')}</SectionLabel>

          {/* Energy slider */}
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="weekly-energy"
                className="text-subhead font-semibold text-foreground flex items-center gap-2"
              >
                <Sparkles className="text-success" size={16} aria-hidden="true" />
                {t('weeklyCheckIn.fields.energyAvg')}
              </Label>
              <span className="text-footnote font-semibold text-foreground tabular-nums">
                {energyAvg} / 10
              </span>
            </div>
            <Slider
              id="weekly-energy"
              min={1}
              max={10}
              step={1}
              value={[energyAvg]}
              onValueChange={(vals) => setEnergyAvg(vals[0] ?? 1)}
              aria-label={t('weeklyCheckIn.fields.energyAvg')}
            />
          </div>

          {/* Sleep avg slider — feeduje recoveryMultiplier */}
          <div className="flex flex-col gap-2 mt-5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="weekly-sleep"
                className="text-subhead font-semibold text-foreground"
              >
                {t('weeklyCheckIn.fields.sleepAvg')}
              </Label>
              <span className="text-footnote font-semibold text-foreground tabular-nums">
                {sleepHoursAvg.toFixed(1)} h
              </span>
            </div>
            <Slider
              id="weekly-sleep"
              min={4}
              max={11}
              step={0.5}
              value={[sleepHoursAvg]}
              onValueChange={(vals) => setSleepHoursAvg(vals[0] ?? 7)}
              aria-label={t('weeklyCheckIn.fields.sleepAvg')}
            />
          </div>

          {/* Stress avg slider 1-5 */}
          <div className="flex flex-col gap-2 mt-5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="weekly-stress"
                className="text-subhead font-semibold text-foreground"
              >
                {t('weeklyCheckIn.fields.stressAvg')}
              </Label>
              <span className="text-footnote font-semibold text-foreground tabular-nums">
                {stressAvg} / 5
              </span>
            </div>
            <Slider
              id="weekly-stress"
              min={1}
              max={5}
              step={1}
              value={[stressAvg]}
              onValueChange={(vals) => setStressAvg(vals[0] ?? 3)}
              aria-label={t('weeklyCheckIn.fields.stressAvg')}
            />
            <p className="text-caption-2 text-muted-foreground">
              {t('weeklyCheckIn.fields.stressHint')}
            </p>
          </div>

          {/* Libido score slider 1-10 — pocetnici.md §4.3 */}
          <div className="flex flex-col gap-2 mt-5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="weekly-libido"
                className="text-subhead font-semibold text-foreground"
              >
                {t('weeklyCheckIn.fields.libido')}
              </Label>
              <span className="text-footnote font-semibold text-foreground tabular-nums">
                {libidoScore} / 10
              </span>
            </div>
            <Slider
              id="weekly-libido"
              min={1}
              max={10}
              step={1}
              value={[libidoScore]}
              onValueChange={(vals) => setLibidoScore(vals[0] ?? 7)}
              aria-label={t('weeklyCheckIn.fields.libido')}
            />
            <p className="text-caption-2 text-muted-foreground">
              {t('weeklyCheckIn.fields.libidoHint')}
            </p>
          </div>

          {/* Water retention slider 1-10 — pocetnici.md §4.3 */}
          <div className="flex flex-col gap-2 mt-5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="weekly-water-retention"
                className="text-subhead font-semibold text-foreground"
              >
                {t('weeklyCheckIn.fields.waterRetention')}
              </Label>
              <span className="text-footnote font-semibold text-foreground tabular-nums">
                {waterRetentionScore} / 10
              </span>
            </div>
            <Slider
              id="weekly-water-retention"
              min={1}
              max={10}
              step={1}
              value={[waterRetentionScore]}
              onValueChange={(vals) => setWaterRetentionScore(vals[0] ?? 3)}
              aria-label={t('weeklyCheckIn.fields.waterRetention')}
            />
            <p className="text-caption-2 text-muted-foreground">
              {t('weeklyCheckIn.fields.waterRetentionHint')}
            </p>
          </div>

          {/* Identity score — segmented 1–5 */}
          <div className="flex flex-col gap-2 mt-5">
            <Label className="text-subhead font-semibold text-foreground">
              {t('weeklyCheckIn.fields.identity')}
            </Label>
            <p className="text-caption-1 text-muted-foreground">
              {t('weeklyCheckIn.fields.identityHint')}
            </p>
            <IdentitySegmented
              value={identityScore}
              onChange={setIdentityScore}
              labelFor={(n) => t(`weeklyCheckIn.identity.${n}`)}
            />
          </div>
        </Card>

        {/* Notes ============================================================ */}
        <Card className="p-5">
          <Label
            htmlFor="weekly-notes"
            className="text-subhead font-semibold text-foreground"
          >
            {t('weeklyCheckIn.fields.notes')}
          </Label>
          <p className="text-caption-1 text-muted-foreground mt-1 mb-3">
            {t('weeklyCheckIn.fields.notesHint')}
          </p>
          <Textarea
            id="weekly-notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('weeklyCheckIn.fields.notesPlaceholder')}
            maxLength={500}
          />
        </Card>

        {/* Submit =========================================================== */}
        <Button
          type="submit"
          variant="cta"
          size="xl"
          disabled={!canSubmit}
          aria-busy={mutation.isPending}
        >
          {mutation.isPending
            ? t('weeklyCheckIn.submitting')
            : t('weeklyCheckIn.submit')}
        </Button>
      </form>

      {/* Confetti burst */}
      {showConfetti && (
        <div
          className="fixed inset-0 pointer-events-none z-toast overflow-hidden"
          aria-hidden="true"
        >
          <ConfettiCelebration count={32} delayMax={0.4} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MeasurementField — small decimal input (waist/hip/thigh cm)
// ============================================================================

interface MeasurementFieldProps {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  invalid: boolean;
}

function MeasurementField({
  id,
  label,
  unit,
  value,
  onChange,
  invalid,
}: MeasurementFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="text-caption-1 font-semibold text-foreground"
      >
        {label}{' '}
        <span className="text-muted-foreground font-normal">({unit})</span>
      </Label>
      <Input
        id={id}
        name={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
      />
    </div>
  );
}

// ============================================================================
// IdentitySegmented — 1–5 radio-like segmented control
// ============================================================================

interface IdentitySegmentedProps {
  value: number;
  onChange: (v: number) => void;
  labelFor: (n: number) => string;
}

function IdentitySegmented({
  value,
  onChange,
  labelFor,
}: IdentitySegmentedProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Identity score"
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
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-foreground hover:bg-muted'
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
