// ============================================================================
// Home — client home (2026-05-09 v5: aligned with onboarding aesthetic)
// ============================================================================
//
// Layout (top-to-bottom):
//   1. Hero header — gradient backdrop + pozdrav + streak + chat
//   2. Notifikacije — algoritamski banneri / sync banner (samo kad treba)
//   3. Card 1: Danas — kcal kao circular ring + koraci ring
//   4. Card 2: Današnji trening (gradient accent + partition badge)
//   5. Card 3: Sledeći obrok (slot ikona + macro chips)
//
// Razlika v4 → v5: vizuelno bogatije, uniformisano sa onboardingom (gradient
// hero, rounded-2xl, layered shadows, partition badge), bez vraćanja water
// widgeta / weekly stripa / bio rings.
// ============================================================================

import { useNavigate } from "react-router-dom";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from "framer-motion";
import {
  MessageCircle, ChevronRight, Dumbbell, Check, Footprints,
  Utensils, type LucideIcon,
} from "lucide-react";
import type { Partition } from "@/types/training";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useNextSession } from "@/hooks/useNextSession";
import { useDailyTotals } from "@/hooks/useDailyTotals";
import { useMealPlan } from "@/hooks/useMealPlan";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { fadeUp, MOTION_DURATION } from "@/lib/motion";
import { isFeatureEnabled } from "@/tenant.config";
import { selectNextMeal } from "@/utils/nutrition/nextMeal";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import AlgorithmStatusBanners from "@/components/algorithm/AlgorithmStatusBanners";
import PausedClientBanner from "@/components/home/PausedClientBanner";
import { shouldReduceMotion } from "@/lib/motion";

const Home = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { clientId, user } = useAuth();
  const { status } = useUserStatus(clientId);
  const { session: nextSession } = useNextSession(clientId);
  const { totals: dailyTotals } = useDailyTotals(clientId);
  const { plan: mealPlan } = useMealPlan();

  const unreadCount = useUnreadMessages(clientId);

  // Streak badge: V3 §2 + §8 — anti-anxiety, hidden iz home hero-a.
  // Citat: "Streak anxiety je real ... Streak je trener-side metric, ne klijent-side".
  // Milestones page i dalje pokazuje streak za opt-in klijente.

  // ── Derived state ──────────────────────────────────────────────────────────
  const displayName = String(
    user?.user_metadata?.first_name
      ?? user?.email?.split("@")[0].split("+")[0]
      ?? "",
  );
  const firstName = displayName.split(" ")[0];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t("home.goodMorning")
    : hour < 18 ? t("home.greetingDay")
    : t("home.greetingEvening");


  // Card 1: Mini data centar
  const calorieGoal = status?.nutrition.currentCalorieTarget ?? 0;
  const calorieCurrent = Math.round(dailyTotals?.caloriesConsumed ?? 0);
  const caloriePct = calorieGoal > 0 ? Math.min(100, Math.round((calorieCurrent / calorieGoal) * 100)) : 0;
  const calorieRemaining = Math.max(0, calorieGoal - calorieCurrent);
  // dailySteps — placeholder dok HealthKit/Google Fit ne bude wired (X-10).
  // Trenutno čitamo iz daily_check_ins.daily_steps preko status (nije još
  // surfaced u status).
  const dailyStepsToday = 0;
  // MVP_PRESET: "better no number than wrong number" — Steps prsten se
  // prikazuje samo kad je healthKit feature uključen I postoji realan podatak.
  // Mrtva "0 / 10,000" nula podriva poverenje u ostale brojeve.
  const showStepsRing = isFeatureEnabled("healthKit") && dailyStepsToday > 0;

  // Card 2: Današnji trening
  const todayWorkout = nextSession ?? null;
  const isWorkoutCompleted = todayWorkout?.status === 'completed';
  const isRestDay = !todayWorkout || todayWorkout.dayType === 'Rest';

  // Card 3: Sledeći obrok — prvi nepojedeni slot današnjeg dana iz
  // MealPlanWeek.slots (bugfix: stara verzija je čitala nepostojeći
  // `mealPlan.meals` pa je kartica uvek bila prazna).
  const mealsLogged = dailyTotals?.mealsLogged ?? 0;
  const {
    slot: nextMealSlot,
    food: nextMealFood,
    todaySlotCount,
    allLogged: allMealsLogged,
  } = selectNextMeal(mealPlan, mealsLogged);
  const nextMeal = nextMealSlot
    ? {
        name: nextMealFood
          ? (language === "sr" ? nextMealFood.nameSr : nextMealFood.nameEn)
          : null,
        calories: nextMealSlot.calories,
        protein: nextMealSlot.protein,
        carbs: nextMealSlot.carbs,
        fat: nextMealSlot.fat,
      }
    : null;

  // Algorithm status props
  const sessionsLen = status?.training.queue?.sessions?.length ?? 0;
  const daysPerWeek = status?.training.daysPerWeek || 3;
  const totalWeeksInMesocycle = Math.max(1, Math.round(sessionsLen / daysPerWeek));

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      {/* ─── 1. Hero header ───────────────────────────────────────────────── */}
      <div className="relative">
        <div className="relative px-5 pt-14 pb-5 flex items-center justify-between">
          <motion.div {...fadeUp()} className="min-w-0">
            <p className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium">
              {greeting}
            </p>
            <h1 className="text-large-title text-foreground mt-0.5 tracking-tight">
              {firstName} <motion.span
                animate={{ rotate: [0, 14, -8, 14, 0] }}
                transition={{ duration: 1.6, delay: 0.6, repeat: 1, repeatDelay: 4 }}
                className="inline-block origin-[70%_70%]"
                aria-hidden="true"
              >👋</motion.span>
            </h1>
          </motion.div>

          <motion.div {...fadeUp(0.08)} className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/chat")}
              className="relative w-11 h-11 rounded-full gradient-primary flex items-center justify-center shadow-fab"
              aria-label={t("a11y.messages")}
            >
              <MessageCircle size={20} className="text-primary-foreground" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-caption-2 font-bold flex items-center justify-center ring-2 ring-background-secondary"
                  aria-label={t("home.unreadMessagesAria").replace("{n}", String(unreadCount))}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </motion.div>
        </div>
      </div>

      <div className="px-5 space-y-4 pb-[100px]">
        {/* Skeleton loading — pre nego što useUserStatus vrati podatke */}
        {!status && (
          <div className="space-y-4" aria-busy="true" aria-label={t("a11y.loading")}>
            <div className="h-20 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-32 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
            <div className="h-24 bg-muted/40 rounded-2xl animate-pulse" />
          </div>
        )}

        {/* Daily check-in uklonjen — algoritam ne traži dnevni unos.
            Weekly check-in pokriva težinu/mere/energiju, pre-workout dialog
            pokriva trenutno raspoloženje (umorna/odmorna). */}

        {/* Pause banner — V3 §10 (klijent je trenutno pauziran od strane trenera) */}
        <PausedClientBanner />

        {/* Algoritamski banneri (week N, smart cut, refeed, neat gate) */}
        {status && (
          <AlgorithmStatusBanners
            currentMicrocycleIndex={status.training.queue?.currentMicrocycleIndex ?? 0}
            totalWeeksInMesocycle={totalWeeksInMesocycle}
            isInDeload={status.training.isInDeload}
            hasHashimoto={status.nutrition.metabolicFilter.includes('hashimoto')}
            currentSmartCutStep={status.nutrition.currentSmartCutStep}
            isIntermediate={status.training.position?.startsWith('intermediate') ?? false}
            targetMode={status.nutrition.targetMode}
            activeRefeedDay={status.nutrition.activeRefeedDay}
            dietBreakActive={status.training.dietBreakActive ?? false}
            isInReturnFromBreak={status.training.isInReturnFromBreak ?? false}
            neatDailyAvg={null}
            smartCutPaused={
              status.nutrition.currentSmartCutStep > 0 &&
              status.bio.latestLibidoScore != null &&
              status.bio.latestLibidoScore < 4
            }
            waterRetentionAlert={(status.bio.latestWaterRetentionScore ?? 0) > 7}
            chronicHardWorkouts={(status.bio.consecutiveHardWorkouts ?? 0) >= 2}
            preWorkoutFatigue={status.bio.preWorkoutFatigue ?? false}
            prefersReducedMotion={shouldReduceMotion()}
          />
        )}

        {/* ─── 3. Card 1: Danas (kcal ring + koraci ring) ────────────────── */}
        <motion.section
          {...fadeUp(0.1)}
          className="bg-card rounded-2xl card-shadow p-5"
          aria-labelledby="card-today-title"
        >
          <h2 id="card-today-title" className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium mb-4">
            {t("home.todayLabel")}
          </h2>
          {/* Kad Steps prsten nije vidljiv, Calories stoji sama — veći ring,
              levo poravnato, bez praznog drugog stupca. */}
          <div className={showStepsRing ? "grid grid-cols-2 gap-4" : "flex"}>
            <StatRing
              label={t("home.calories")}
              value={calorieCurrent}
              total={calorieGoal}
              suffix={`/ ${calorieGoal} kcal`}
              footnote={t("home.caloriesRemainingShort").replace("{n}", String(calorieRemaining))}
              tone="primary"
              size={showStepsRing ? 72 : 88}
            />
            {showStepsRing && (
              <StatRing
                label={t("home.steps")}
                value={dailyStepsToday}
                total={10000}
                suffix="/ 10,000"
                footnote={dailyStepsToday > 0 ? t("home.stepsGoodJob") : t("home.stepsTarget")}
                tone="info"
                icon={Footprints}
              />
            )}
          </div>
        </motion.section>

        {/* ─── 4. Card 2: Današnji trening (gradient accent) ─────────────── */}
        <motion.section {...fadeUp(0.15)} aria-labelledby="card-workout-title">
          {isRestDay ? (
            <div className="relative overflow-hidden bg-card rounded-2xl card-shadow p-5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-success/40" aria-hidden="true" />
              <h2 id="card-workout-title" className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium mb-3">
                {t("home.todaysWorkoutLabel")}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                  <Check size={24} className="text-success" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-headline font-semibold text-foreground">
                    {t("home.restDay")}
                  </p>
                  <p className="text-footnote text-muted-foreground">
                    {t("home.restDayBody")}
                  </p>
                </div>
              </div>
            </div>
          ) : isWorkoutCompleted ? (
            <div className="relative overflow-hidden bg-card rounded-2xl card-shadow p-5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-success/60" aria-hidden="true" />
              <h2 id="card-workout-title" className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium mb-3">
                {t("home.todaysWorkoutLabel")}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                  <Check size={24} className="text-success" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-headline font-semibold text-foreground">
                    {todayWorkout?.label || t("home.workoutDefault")}
                  </p>
                  <p className="text-footnote text-success">
                    {t("home.workoutCompleted")} ✓
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/gym')}
              className="relative overflow-hidden w-full bg-card rounded-2xl card-shadow p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary"
              aria-label={t("gym.startWorkoutCta")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 gradient-primary" aria-hidden="true" />
              <h2 id="card-workout-title" className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium mb-3">
                {t("home.todaysWorkoutLabel")}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-fab">
                  <Dumbbell size={24} className="text-primary-foreground" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-headline font-semibold text-foreground truncate">
                    {todayWorkout?.label || t("home.workoutDefault")}
                  </p>
                  <p className="text-footnote text-muted-foreground">
                    {todayWorkout?.partition === 'FullBody' ? 'Full Body' : todayWorkout?.partition}
                    {todayWorkout?.dayRole ? ` · ${todayWorkout.dayRole}` : ''}
                  </p>
                </div>
                {todayWorkout?.partition && (
                  <PartitionPill partition={todayWorkout.partition as Partition} />
                )}
                <ChevronRight size={ICON_SIZE.md} className="text-muted-foreground shrink-0" aria-hidden="true" />
              </div>
            </button>
          )}
        </motion.section>

        {/* ─── 5. Card 3: Sledeći obrok ──────────────────────────────────── */}
        <motion.section {...fadeUp(0.2)} aria-labelledby="card-meal-title">
          {allMealsLogged ? (
            <div className="relative overflow-hidden bg-card rounded-2xl card-shadow p-5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-success/60" aria-hidden="true" />
              <h2 id="card-meal-title" className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium mb-3">
                {t("home.mealsLabel")}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                  <Check size={24} className="text-success" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-headline font-semibold text-foreground">
                    {t("home.allMealsLogged")}
                  </p>
                  <p className="text-footnote text-muted-foreground">
                    {t("home.dailyMealsCount").replace("{x}", String(mealsLogged)).replace("{y}", String(todaySlotCount))}
                  </p>
                </div>
              </div>
            </div>
          ) : nextMeal ? (
            <button
              onClick={() => navigate('/food')}
              className="relative overflow-hidden w-full bg-card rounded-2xl card-shadow p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary"
              aria-label={t("home.nextMeal")}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-warning/60" aria-hidden="true" />
              <h2 id="card-meal-title" className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium mb-3">
                {t("home.nextMeal")}
              </h2>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0">
                  <Utensils size={24} className="text-warning" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* line-clamp-2 umesto truncate — duga imena obroka
                      ("Oatmeal with Banana & ...") se prelamaju u 2 reda */}
                  <p className="text-headline font-semibold text-foreground line-clamp-2">
                    {nextMeal.name || t("home.mealDefault")}
                  </p>
                  <p className="text-footnote text-muted-foreground tabular-nums">
                    {Math.round(nextMeal.calories)} kcal
                  </p>
                </div>
                <ChevronRight size={ICON_SIZE.md} className="text-muted-foreground shrink-0" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2">
                <MacroChip label="P" value={Math.round(nextMeal.protein)} tone="primary" />
                <MacroChip label="C" value={Math.round(nextMeal.carbs)} tone="info" />
                <MacroChip label="F" value={Math.round(nextMeal.fat)} tone="warning" />
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate('/food')}
              className="relative overflow-hidden w-full bg-card rounded-2xl card-shadow p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary"
              aria-label={t("home.viewMealPlan")}
            >
              <h2 id="card-meal-title" className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium mb-3">
                {t("home.mealsLabel")}
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center shrink-0">
                  <Utensils size={24} className="text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-headline font-semibold text-foreground">
                    {t("home.viewMealPlan")}
                  </p>
                  <p className="text-footnote text-muted-foreground">
                    {t("home.viewMealPlanSub")}
                  </p>
                </div>
                <ChevronRight size={ICON_SIZE.md} className="text-muted-foreground shrink-0" aria-hidden="true" />
              </div>
            </button>
          )}
        </motion.section>
      </div>

    </div>
  );
};

// ============================================================================
// Helper komponente
// ============================================================================

interface StatRingProps {
  label: string;
  value: number;
  total: number;
  suffix?: string;
  footnote?: string;
  tone: "primary" | "info";
  icon?: LucideIcon;
  /** Prečnik prstena u px — 72 default; 88 kad metrika stoji sama u kartici. */
  size?: number;
}

const StatRing = ({ label, value, total, suffix, footnote, tone, icon: Icon, size = 72 }: StatRingProps) => {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  // Boja: primary koristi gradient, info koristi solid token
  const strokeColor = tone === "primary" ? "url(#ringGradient)" : "hsl(var(--info))";

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          {tone === "primary" && (
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" />
              </linearGradient>
            </defs>
          )}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: `stroke-dashoffset ${MOTION_DURATION.xSlow}s ease-out` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Icon && <Icon size={14} className={tone === "info" ? "text-info" : "text-primary"} aria-hidden={true} />}
          <span className="text-footnote font-bold text-foreground tabular-nums leading-none">
            {value > 999 ? `${(value / 1000).toFixed(1)}k` : value}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-caption-1 text-muted-foreground font-medium">{label}</p>
        {suffix && (
          <p className="text-caption-2 text-muted-foreground/80 tabular-nums">{suffix}</p>
        )}
        {footnote && (
          <p className="text-caption-2 text-muted-foreground mt-1">{footnote}</p>
        )}
      </div>
    </div>
  );
};

const PARTITION_PILL_CONFIG: Record<Partition, { bg: string; text: string; label: string }> = {
  Lower: { bg: "bg-success/15", text: "text-success", label: "L" },
  Upper: { bg: "bg-info/15", text: "text-info", label: "U" },
  FullBody: { bg: "bg-primary/15", text: "text-primary", label: "FB" },
};

const PartitionPill = ({ partition }: { partition: Partition }) => {
  const c = PARTITION_PILL_CONFIG[partition];
  if (!c) return null;
  return (
    <div
      className={`shrink-0 w-9 h-9 rounded-xl ${c.bg} ${c.text} flex items-center justify-center text-caption-1 font-bold`}
      aria-label={`${partition} particija`}
    >
      {c.label}
    </div>
  );
};

interface MacroChipProps {
  label: "P" | "C" | "F";
  value: number;
  tone: "primary" | "info" | "warning";
}

const MACRO_TONE_CLASSES: Record<MacroChipProps["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
};

const MacroChip = ({ label, value, tone }: MacroChipProps) => (
  <span
    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption-2 font-semibold tabular-nums ${MACRO_TONE_CLASSES[tone]}`}
  >
    <span className="opacity-70">{label}</span>
    <span>{value}g</span>
  </span>
);

export default Home;
