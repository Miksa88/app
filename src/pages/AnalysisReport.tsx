import { useMemo, useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Check, Sparkles, Dumbbell, UtensilsCrossed, Target,
  MessageSquare, Database,
} from "lucide-react";
import { fadeUp, TAP_SCALE, MOTION_EASE } from "@/lib/motion";
import { MotionCard } from "@/components/ui/motion-card";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { computePersonalizedPlan } from "@/utils/planPersonalization";
import { completeOnboarding } from "@/services/onboardingService";
import type {
  ExperienceLevel,
  PrimaryGoal,
  MetabolicCondition,
} from "@/types/training";

// ============================================================================
// "Your plan is ready" — Apple HIG redesign (2026-04-20)
// ============================================================================
//
// Pravilo: samo CTA ima primary accent (gradient). Sve ostalo je tih.
// Hero card = bela sa tankim gradient top accent strip (3px) + suptilan
// primary tint (4%) background. Trial info je fine-print ispod dugmeta,
// ne u boxu sa kalendarskom ikonom.
// ============================================================================

const AnalysisReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = location.state || {};
  const [submitting, setSubmitting] = useState(false);
  const { clientId, isMockAuth } = useAuth();

  const handleStartTrial = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Race condition fix: posle SignUpSheet.signUp, AuthContext onAuthStateChange
      // može biti par stotina ms zaostao. Čekamo do 5s na clientId; ako i dalje
      // null — verovatno email confirmation pending → poll supabase.auth.getSession()
      // direktno (umesto navigate koji ProtectedRoute bounce-uje na /).
      let resolvedClientId = clientId;
      if (!resolvedClientId) {
        for (let i = 0; i < 10; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const { data } = await supabase.auth.getSession();
          if (data.session?.user?.id) {
            resolvedClientId = data.session.user.id;
            break;
          }
        }
      }

      if (!resolvedClientId) {
        // eslint-disable-next-line no-console
        console.warn('[AnalysisReport] Sesija nije dostupna posle 5s — verovatno email confirmation pending.');
        const fallback = "Proveri svoj email da potvrdiš nalog, pa pokušaj ponovo.";
        const friendly = t("analysis.errorNoSession");
        toast.error(friendly && friendly !== "analysis.errorNoSession" ? friendly : fallback);
        setSubmitting(false);
        return;
      }
      if (isMockAuth) {
        // eslint-disable-next-line no-console
        console.info(`[AnalysisReport] Mock auth — pokrecem completeOnboarding za ${clientId}`);
      }

      const cleanInjuries = (data.injuries ?? data.limitations ?? [])
        .filter((i: string) => i && i !== 'none');
      const cleanAllergies = (data.allergies ?? [])
        .filter((a: string) => a && a !== 'none');
      const cleanMetabolic = (data.metabolicProfile ?? [])
        .filter((m: string) => m && m !== 'none') as MetabolicCondition[];

      const expRaw: string = data.experience || 'beginner';
      const experienceLevel: ExperienceLevel =
        expRaw === 'beginner' ? 'beginner' : 'intermediate';

      const result = await completeOnboarding({
        clientId: resolvedClientId,
        firstName: data.firstName ?? 'Korisnica',
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ?? data.age ?? new Date().toISOString().slice(0, 10),
        weightKg: Number(data.weight) || 65,
        heightCm: Number(data.height) || 168,
        experienceLevel,
        trainingDays: (Number(data.frequency) || 3) as 3 | 4 | 5,
        primaryGoal: mapLegacyGoalToPrimary(data.goal),
        metabolicConditions: cleanMetabolic,
        injuries: cleanInjuries,
        allergies: cleanAllergies,
        sleepHoursAvg: typeof data.sleepQuality === 'number' ? data.sleepQuality : 7,
        stressLevel: clampStress(data.stressLevel),
        cycleTrackingEnabled: Boolean(data.cycleTrackingEnabled),
        lastPeriodStart: data.lastPeriodStart || undefined,
      });

      if (result.warnings.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('[Onboarding] Warnings:', result.warnings);
      }
      navigate("/home");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Onboarding] completeOnboarding failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      const fallback = "Kreiranje plana nije uspelo. Probaj ponovo ili kontaktiraj podršku.";
      const friendly = t("analysis.errorGeneric");
      toast.error(
        // i18n key vraća sebe samog kad nema prevoda — koristi fallback ako tako vrati
        friendly && friendly !== "analysis.errorGeneric" ? friendly : fallback,
        { description: errMsg },
      );
      // NE navigate na /home — ostavi user na /analysis sa toast-om umesto
      // silent bounce kroz ProtectedRoute → /
    } finally {
      setSubmitting(false);
    }
  };

  const plan = useMemo(() => {
    try {
      return computePersonalizedPlan(data);
    } catch {
      return computePersonalizedPlan({});
    }
  }, [data]);

  const hasAdaptations = plan.adaptations.length > 0;
  const adaptationsLabel = plan.adaptations
    .map(a => {
      const limKey = `limitation.${a}`;
      const allKey = `allergy.${a}`;
      if (t(limKey) !== limKey) return t(limKey);
      if (t(allKey) !== allKey) return t(allKey);
      return a;
    })
    .join(", ");

  const subtitle = plan.validName
    ? t("analysis.subtitle").replace("{name}", plan.validName)
    : t("analysis.subtitleGeneric");

  const features = [
    { icon: Dumbbell, label: t("analysis.workoutTracking") },
    { icon: Database, label: t("analysis.mealDatabase") },
    { icon: MessageSquare, label: t("analysis.directMessaging") },
  ];

  return (
    <div className="min-h-screen bg-background-secondary flex flex-col">
      <div className="flex-1 flex flex-col px-5 pt-14 pb-6">
        <div className="w-full max-w-md mx-auto flex flex-col flex-1">

          {/* ============ Header — suptilan icon + naslov ============ */}
          <motion.div {...fadeUp(0)} className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-primary" strokeWidth={2} aria-hidden="true" />
            </div>
            <h1 className="text-large-title font-bold text-foreground tracking-tight leading-tight">
              {t("analysis.planReady")}
            </h1>
            <motion.p {...fadeUp(0.1)} className="text-body text-muted-foreground mt-2 max-w-[300px]">
              {subtitle}
            </motion.p>
          </motion.div>

          {/* ============ Plan Summary — TIHI card sa gradient accent strip ============ */}
          <motion.div {...fadeUp(0.2)} className="mt-8">
            <div className="relative bg-card rounded-3xl overflow-hidden card-shadow">
              {/* Gradient accent strip — jedino brand obeležje */}
              <div className="absolute top-0 left-0 right-0 h-[3px] gradient-primary" aria-hidden="true" />

              <div className="p-6 space-y-0 divide-y divide-border/60">
                <PlanSection
                  icon={<Dumbbell size={16} className="text-primary" aria-hidden="true" />}
                  label={t("analysis.yourTraining")}
                  title={plan.programName}
                  meta={`${plan.programDuration} ${t("analysis.weeks")} · ${plan.frequency}× ${t("analysis.perWeek")}`}
                />
                <PlanSection
                  icon={<UtensilsCrossed size={16} className="text-primary" aria-hidden="true" />}
                  label={t("analysis.yourNutrition")}
                  title={`${plan.dailyCalories.toLocaleString()} ${t("analysis.caloriesDaily")}`}
                  meta={`${plan.mealCount} ${t("analysis.mealsPerDay")} · ${plan.isHighProtein ? "High Protein" : "Balanced"}`}
                />
                <PlanSection
                  icon={<Target size={16} className="text-primary" aria-hidden="true" />}
                  label={t("analysis.designedFor")}
                  title={t(`goalLabel.${plan.goalKey}`)}
                  meta={hasAdaptations ? `${t("analysis.tailoredAround")}: ${adaptationsLabel}` : undefined}
                />
              </div>
            </div>
          </motion.div>

          {/* ============ Feature list ============ */}
          <MotionCard {...fadeUp(0.35)} className="mt-5 overflow-hidden">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-4 min-h-14 ${
                    i < features.length - 1 ? "border-b border-border/60" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Icon size={ICON_SIZE.md} className="text-primary" strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  <p className="text-body text-foreground flex-1">{feat.label}</p>
                  <Check size={ICON_SIZE.md} className="text-primary shrink-0" strokeWidth={2.5} aria-hidden="true" />
                </div>
              );
            })}
          </MotionCard>

          <div className="flex-1 min-h-10" />

          {/* ============ CTA — jedini akcent na ekranu ============ */}
          <motion.div {...fadeUp(0.5)} className="mt-8">
            <motion.button
              whileTap={{ scale: TAP_SCALE.primary }}
              onClick={handleStartTrial}
              disabled={submitting}
              className="w-full h-[56px] rounded-2xl gradient-primary text-primary-foreground text-body font-semibold shadow-fab flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: MOTION_EASE.linear }}
                    className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    aria-hidden="true"
                  />
                  Pokretanje...
                </>
              ) : (
                <>
                  {t("analysis.startTrial")}
                  <ArrowRight size={ICON_SIZE.md} strokeWidth={2.5} aria-hidden="true" />
                </>
              )}
            </motion.button>

            {/* Trial fine print — Apple style, tihi footer */}
            <p className="text-footnote text-muted-foreground text-center mt-3">
              14 dana besplatno · Otkaži kad god želiš
            </p>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PlanSection — jedan red u tihom hero card-u (iOS inset list style)
// ============================================================================

interface PlanSectionProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  meta?: string;
}

const PlanSection = ({ icon, label, title, meta }: PlanSectionProps) => (
  <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-caption-2 font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
        {label}
      </p>
      <p className="text-body font-bold text-foreground mt-1 leading-tight">{title}</p>
      {meta && <p className="text-footnote text-muted-foreground mt-0.5">{meta}</p>}
    </div>
  </div>
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapLegacyGoalToPrimary(goal?: string): PrimaryGoal {
  if (goal === 'glute_focus' || goal === 'figure') return 'glute_focus';
  if (goal === 'tone' || goal === 'muscle_gain') return 'tone';
  return 'fat_loss';
}

function clampStress(level: unknown): 1 | 2 | 3 | 4 | 5 {
  const n = typeof level === 'number' ? level : 3;
  return Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
}

export default AnalysisReport;
