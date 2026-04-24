import { useNavigate } from "react-router-dom";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from "framer-motion";
import {
  Flame, Droplets, Minus, Plus, MessageCircle, Lock,
  ChevronRight, Moon, AlertTriangle, Footprints, Activity, Sun, Clock, Dumbbell, Check,
  Play, Sparkles, Drumstick, Wheat, CalendarCheck,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useNextSession } from "@/hooks/useNextSession";
import { useWeeklyCalendar } from "@/hooks/useWeeklyCalendar";
import { fadeUp, MOTION_DURATION , IOS_SPRING} from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatCard } from "@/components/ui/stat-card";
import { SectionLabel } from "@/components/ui/section-label";
import { useHaptic } from "@/hooks/useHaptic";
import { useStreakMilestones } from "@/hooks/useStreakMilestones";
import { AchievementOverlay } from "@/components/AchievementOverlay";
import { Card } from "@/components/ui/card";
import { MotionCard } from "@/components/ui/motion-card";
import { Button } from "@/components/ui/button";
import { DailyCheckInSheet } from "@/components/checkin/DailyCheckInSheet";
import { AlertBanner } from "@/components/ui/alert-banner";
import { useHydration } from "@/hooks/useHydration";
import { useLogWaterGlass, DEFAULT_GLASS_ML } from "@/hooks/mutations/useLogWaterGlass";
import type { Partition } from "@/types/training";

// ============================================================================
// Home — uniformisano sa ostalim app-om (2026-04-20 v3)
// ============================================================================
//
// Dizajn jezik (isti kao TrainerDashboard, AnalysisReport, Onboarding):
//   - bg-background-secondary, px-5 screen padding
//   - bg-card rounded-2xl card-shadow za card-ove
//   - gradient primary za TODAY HERO + main CTA (glavni fokus screen-a)
//   - brand palette: primary/secondary za akcente, semantic za tonove
//   - iOS HIG typography (text-large-title, text-title-*, text-caption-1)
//
// Sekcije (iz promta):
//   1. Header + streak + chat
//   2. Dynamic Sync Banner (conditional)
//   3. Today Hero (training ili rest)
//   4. Ova nedelja — weekly strip 7 circles
//   5. Tvoje stanje — bio rings + san/stres mini cards
//   6. Unos energije — fueling sa macros
//   7. Hidracija
// ============================================================================

const Home = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId, user } = useAuth();
  const { status } = useUserStatus(clientId);
  const { session: nextSession } = useNextSession(clientId);
  const { view: weeklyView } = useWeeklyCalendar(clientId);

  const [unreadCount] = useState(3);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const haptic = useHaptic();

  // ============================================================================
  // Hidracija (IT-14) — real state iz UserStatus + mutation hook
  // ============================================================================
  const hydration = useHydration(clientId);
  const logWaterGlass = useLogWaterGlass();

  // Optimistic local layer: pending mutation-i se dodaju na server vrednost
  // dok Realtime ne vrati updated hydrationTodayMl. Svaka čaša = 250ml
  // (DEFAULT_GLASS_ML), pa se pending koristi i za čaše i za ml prikaz.
  const [optimisticGlasses, setOptimisticGlasses] = useState(0);
  const waterGoal = hydration.targetGlasses > 0 ? hydration.targetGlasses : 8;
  const waterGlasses = Math.min(
    waterGoal,
    hydration.glasses + optimisticGlasses,
  );
  const waterMlDisplay =
    hydration.hydrationMl + optimisticGlasses * DEFAULT_GLASS_ML;

  // Derive "has checked in today" — heuristika:
  //   status.lastUpdatedAt >= startOfToday signalizira da je save-user-status
  //   EF upisao promene danas (dnevni check-in je jedini flow koji pomera
  //   lastUpdatedAt u FAZI A). Dok ne bude dedicated read hook-a (N-X), ovo
  //   pokriva baseline case dovoljno tačno za CTA visibility.
  const hasCheckInToday = (() => {
    if (!status?.lastUpdatedAt) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return status.lastUpdatedAt >= startOfToday;
  })();

  // Cycle tracker presence — ako bio ima cycleDay ili cyclePhase, tracker je
  // aktivan (profile.cycleTrackingEnabled je upisao status bio). Sheet sakriva
  // cycle day polje ako je ovo false.
  const cycleTrackingEnabled =
    status?.bio.cycleDay !== null && status?.bio.cycleDay !== undefined
      ? true
      : status?.bio.cyclePhase !== null && status?.bio.cyclePhase !== undefined;

  // Streak milestone celebration — WS-8 G10
  const currentStreak = 14;
  const { milestone, dismissMilestone } = useStreakMilestones(currentStreak);

  const addWater = () => {
    if (!clientId) return;
    if (waterGlasses >= waterGoal) return;
    haptic("light");
    // Optimistic +1 glass; rollback u onError; pending prikaz traje do Realtime
    // refresh-a (useUserStatus → React Query invalidate).
    setOptimisticGlasses((p) => p + 1);
    logWaterGlass.mutate(
      { clientId },
      {
        onSuccess: () => setOptimisticGlasses((p) => Math.max(0, p - 1)),
        onError: () => setOptimisticGlasses((p) => Math.max(0, p - 1)),
      },
    );
  };
  // Remove/setTo nisu podržani kao operacije — water_logs je append-only po
  // spec-u 02 §8.1. UI zadržava isti layout ali minus dugme postaje no-op /
  // hidden (disabled kad je waterGlasses === 0 pokriva vizuel).
  const removeWater = () => {
    haptic("selection");
    // NOOP: append-only store. Rollback pending optimistic ako postoji.
    setOptimisticGlasses((p) => Math.max(0, p - 1));
  };
  const setWaterTo = (n: number) => {
    // Dots ostaju za prikaz; klik na dot i dalje dodaje staklo ako je tap iznad
    // trenutne vrednosti (append-only UX model).
    if (n > waterGlasses) addWater();
    else haptic("selection");
  };

  const displayName = String(user?.user_metadata?.first_name ?? "Sarah");
  const firstName = displayName.split(" ")[0];

  const [trialExpired, setTrialExpired] = useState(false);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Dobro jutro"
    : hour < 18 ? "Dobar dan"
    : "Dobro veče";

  const todayCell = weeklyView?.days.find(d => d.isToday);
  const isTodayTraining = todayCell?.kind.type === "training";
  const todaySession = todayCell?.kind.type === "training" ? todayCell.kind.session : null;

  // Sync banner signali
  const cyclePhase = status?.bio.cyclePhase ?? null;
  const isLuteal = cyclePhase === "luteal";
  const isMenstrual = cyclePhase === "menstrual";
  const isInDeload = status?.training.isInDeload ?? false;
  const isIllness = status?.training.activePauseEvent?.type === "illness";
  const showSyncBanner = isLuteal || isMenstrual || isInDeload || isIllness;
  const syncBanner = getSyncBannerContent({ isLuteal, isMenstrual, isInDeload, isIllness });

  // IT-17: nedeljni check-in banner — ako je prošlo > 7 dana od poslednjeg.
  // Brojač se resetuje u process-weekly-check-in EF-u (redFlags.daysSinceLastWeeklyCheckIn=0).
  // Increment logika (daily tick ili lazy cron) je out-of-scope za IT-17;
  // ova grana samo čita flag.
  const showWeeklyCheckInBanner =
    (status?.redFlags.daysSinceLastWeeklyCheckIn ?? 0) > 7;

  return (
    <div className="min-h-screen bg-background-secondary pb-24">
      {/* Trial expired overlay */}
      {trialExpired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="trial-expired-title"
          aria-describedby="trial-expired-desc"
          className="fixed inset-0 z-50 bg-background-secondary flex flex-col items-center justify-center px-8 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Lock size={36} className="text-primary" aria-hidden="true" />
          </div>
          <h2 id="trial-expired-title" className="text-title-1 text-foreground mb-2">{t("trial.expired")}</h2>
          <p id="trial-expired-desc" className="text-body text-muted-foreground mb-8 max-w-xs">
            {t("trial.expiredMessage")}
          </p>
          <Button
            onClick={() => navigate("/subscription")}
            variant="cta"
            size="xl"
            className="max-w-xs"
          >
            {t("trial.subscribe")}
          </Button>
          <Button
            onClick={() => setTrialExpired(false)}
            variant="link"
            className="mt-4 text-muted-foreground min-h-11 hover:no-underline"
          >
            {t("trial.later")}
          </Button>
        </motion.div>
      )}

      {/* ============ 1. Header — greeting + streak + chat (kao trener dashboard) ============ */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
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
            onClick={() => navigate("/milestones")}
            className="flex items-center gap-1 bg-card px-3 py-2 rounded-full card-shadow min-h-11"
            aria-label={t("a11y.milestones")}
          >
            <Flame size={16} className="text-warning" aria-hidden="true" />
            <span className="text-subhead font-semibold text-foreground">14</span>
          </button>
          <button
            onClick={() => navigate("/chat")}
            className="relative w-11 h-11 rounded-full gradient-primary flex items-center justify-center shadow-fab"
            aria-label={t("a11y.messages")}
          >
            <MessageCircle size={20} className="text-primary-foreground" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-caption-2 font-bold flex items-center justify-center ring-2 ring-background-secondary"
                aria-label={`${unreadCount} novih poruka`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </motion.div>
      </div>

      <div className="px-5 space-y-4 pb-[100px]">
        {/* ============ 1. Sync Banner (conditional) ============ */}
        {showSyncBanner && syncBanner && (
          <motion.div {...fadeUp(0.1)}>
            <SyncBanner {...syncBanner} />
          </motion.div>
        )}

        {/* ============ 1a. Weekly check-in banner (IT-17) — > 7 dana ============ */}
        {showWeeklyCheckInBanner && (
          <motion.div {...fadeUp(0.105)}>
            <AlertBanner
              tone="info"
              icon={CalendarCheck}
              title={t("weeklyCheckIn.banner.title")}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    haptic("light");
                    navigate("/weekly-check-in");
                  }}
                >
                  {t("weeklyCheckIn.banner.cta")}
                </Button>
              }
            >
              {t("weeklyCheckIn.banner.desc")}
            </AlertBanner>
          </motion.div>
        )}

        {/* ============ 1b. Daily check-in CTA (IT-6) — samo ako još nema danas ============ */}
        {clientId && !hasCheckInToday && (
          <motion.div {...fadeUp(0.11)}>
            <Button
              variant="cta"
              size="xl"
              onClick={() => {
                haptic("light");
                setCheckinOpen(true);
              }}
              aria-label={t("a11y.openCheckin")}
            >
              {t("checkin.cta")}
            </Button>
          </motion.div>
        )}

        {/* ============ 2. Weekly strip — samoopisan, bez caption-a (iOS HIG Deference) ============ */}
        <motion.div {...fadeUp(0.12)}>
          <WeeklyStripBrand days={weeklyView?.days ?? fallbackWeekDays()} />
        </motion.div>

        {/* ============ 3. Today Hero — trening ili dan za oporavak ============ */}
        <motion.div {...fadeUp(0.16)}>
          {isTodayTraining && todaySession ? (
            <TodayTrainingHero
              title={humanWorkoutTitle(todaySession.label, todaySession.partition)}
              intensity={humanIntensity(todaySession.label)}
              durationMin={45}
              partition={todaySession.partition}
              onStart={() => navigate("/workout/active")}
            />
          ) : (
            <RestDayHero nextSessionLabel={nextSession ? humanWorkoutTitle(nextSession.label, nextSession.partition as Partition) : null} />
          )}
        </motion.div>

        {/* ============ 5. Tvoje stanje — bio rings + san/stres ============ */}
        <motion.div {...fadeUp(0.22)}>
          <SectionLabel>Tvoje stanje</SectionLabel>
          <Card className="p-5 mt-2">
            <BioFeedbackRings
              steps={{ current: 6400, goal: 10000 }}
              activity={{ current: 28, goal: 45 }}
              hydration={{ current: waterMlDisplay, goal: hydration.targetMl }}
            />
          </Card>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <StatCard
              icon={<Moon size={ICON_SIZE.md} />}
              iconBg="bg-info/10"
              iconColor="text-info"
              label="San"
              value="7.5h"
              subtitle="Dobro"
            />
            <StatCard
              icon={<Activity size={ICON_SIZE.md} />}
              iconBg="bg-success/10"
              iconColor="text-success"
              label="Stres"
              value="Nizak"
              subtitle="Spremna si"
            />
          </div>
        </motion.div>

        {/* ============ 6. Dnevni unos kalorija — fueling + macros ============ */}
        <motion.div {...fadeUp(0.26)}>
          <Card className="p-5">
            <FuelingSection
              kcalCurrent={1302}
              kcalGoal={2100}
              fuelPct={62}
              protein={{ current: 92, goal: 140 }}
              carbs={{ current: 140, goal: 220 }}
              fat={{ current: 42, goal: 65 }}
            />
          </Card>
        </motion.div>

        {/* ============ 7. Unos vode (IT-14) ============ */}
        <MotionCard {...fadeUp(0.3)} className="p-5" data-testid="water-widget">
          {/* Header: ikona + naslov + counter (+training bonus badge ako je trening dan) */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <Droplets size={ICON_SIZE.md} className="text-info" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-subhead font-semibold text-foreground">{t("home.water")}</p>
                {hydration.isTrainingDay && (
                  <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-full bg-info/10 ring-1 ring-info/20">
                    <span className="text-caption-2 font-semibold text-info">
                      {t("home.waterTrainingBonus")}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <span className="text-title-3 font-bold text-foreground tabular-nums" data-testid="water-count">
              {waterGlasses}/{waterGoal}
            </span>
          </div>

          {/* Glass dots u redu — ne renderujemo ako je goal nerazuman (safety) */}
          <div className="flex items-center gap-2 mb-5">
            {Array.from({ length: Math.min(waterGoal, 16) }).map((_, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.85 }}
                onClick={() => setWaterTo(i + 1)}
                className={`flex-1 h-11 rounded-lg transition-base min-h-11 ${
                  i < waterGlasses
                    ? "bg-info/20 ring-1 ring-info/40"
                    : "bg-muted/60"
                }`}
                aria-label={`${t("home.waterGlasses")} ${i + 1}`}
              >
                <Droplets
                  size={ICON_SIZE.sm}
                  className={`mx-auto ${i < waterGlasses ? "text-info" : "text-muted-foreground/30"}`}
                  aria-hidden="true"
                />
              </motion.button>
            ))}
          </div>

          {/* Minus (rollback optimistic) · ml / target prikaz · Plus */}
          <div className="flex items-center justify-center gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={removeWater}
              disabled={waterGlasses === 0}
              className="w-11 h-11 rounded-full bg-muted flex items-center justify-center min-w-11 min-h-11 disabled:opacity-30"
              aria-label={t("a11y.waterLess")}
            >
              <Minus size={ICON_SIZE.md} className="text-foreground" aria-hidden="true" />
            </motion.button>

            <div className="text-center min-w-20" data-testid="water-ml-display">
              <p className="text-title-2 font-bold text-foreground tabular-nums leading-none">
                {waterMlDisplay}
              </p>
              <p className="text-caption-1 text-muted-foreground mt-1">
                / {hydration.targetMl} ml
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={addWater}
              disabled={!clientId || waterGlasses >= waterGoal || logWaterGlass.isPending}
              className="w-11 h-11 rounded-full bg-info flex items-center justify-center min-w-11 min-h-11 disabled:opacity-30"
              aria-label={t("home.waterAddGlass")}
              data-testid="water-add-glass"
            >
              <Plus size={ICON_SIZE.md} className="text-primary-foreground" aria-hidden="true" />
            </motion.button>
          </div>
        </MotionCard>
      </div>

      {/* Streak milestone celebration — WS-8 G10 */}
      <AchievementOverlay milestone={milestone} onDismiss={dismissMilestone} />

      {/* Daily check-in sheet (IT-6) */}
      {clientId && (
        <DailyCheckInSheet
          open={checkinOpen}
          onOpenChange={setCheckinOpen}
          clientId={clientId}
          cycleTrackingEnabled={cycleTrackingEnabled}
          initialCycleDay={status?.bio.cycleDay ?? null}
        />
      )}
    </div>
  );
};

// ============================================================================
// SyncBanner — semantic tint (warning/info/secondary)
// ============================================================================

interface SyncBannerProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone: 'warning' | 'info' | 'secondary';
}

const SyncBanner = ({ icon, title, subtitle, tone }: SyncBannerProps) => {
  const toneConfig = {
    warning: { bg: 'bg-warning/8', ring: 'ring-warning/20', iconBg: 'bg-warning/15 text-warning' },
    info: { bg: 'bg-info/8', ring: 'ring-info/20', iconBg: 'bg-info/15 text-info' },
    secondary: { bg: 'bg-secondary/8', ring: 'ring-secondary/20', iconBg: 'bg-secondary/15 text-secondary' },
  }[tone];

  return (
    <div className={`rounded-2xl p-4 flex items-start gap-3 ring-1 ${toneConfig.bg} ${toneConfig.ring}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 breathe ${toneConfig.iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-foreground leading-tight">{title}</p>
        <p className="text-footnote text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
};

interface SyncState {
  isLuteal: boolean;
  isMenstrual: boolean;
  isInDeload: boolean;
  isIllness: boolean;
}

function getSyncBannerContent(s: SyncState): SyncBannerProps | null {
  if (s.isIllness) {
    return {
      icon: <AlertTriangle size={ICON_SIZE.md} aria-hidden="true" />,
      title: "Tvoje telo traži odmor",
      subtitle: "Blaži tempo dok se oporaviš. Plan smo prilagodili.",
      tone: 'warning',
    };
  }
  if (s.isInDeload) {
    return {
      icon: <Moon size={ICON_SIZE.md} aria-hidden="true" />,
      title: "Deload nedelja",
      subtitle: "Nedelja za oporavak. Mišići rastu u miru.",
      tone: 'info',
    };
  }
  if (s.isLuteal) {
    return {
      icon: <Sun size={ICON_SIZE.md} aria-hidden="true" />,
      title: "Lutealna faza: prioritet oporavak",
      subtitle: "Malo više ugljenih, blaži intenzitet. To je OK.",
      tone: 'warning',
    };
  }
  if (s.isMenstrual) {
    return {
      icon: <Moon size={ICON_SIZE.md} aria-hidden="true" />,
      title: "Menstrualna faza",
      subtitle: "Slušaj svoje telo. Težina danas nije signal.",
      tone: 'secondary',
    };
  }
  return null;
}

// ============================================================================
// TodayTrainingHero — gradient hero (kao trener dashboard + AnalysisReport hero)
// ============================================================================

const PARTITION_CHIP_LABEL: Record<Partition, string> = {
  Lower: "Lower",
  Upper: "Upper",
  FullBody: "Full Body",
};

interface TodayTrainingHeroProps {
  title: string;
  intensity: string;
  durationMin: number;
  partition: Partition;
  onStart: () => void;
}

const TodayTrainingHero = ({ title, intensity, durationMin, partition, onStart }: TodayTrainingHeroProps) => (
  <button
    onClick={onStart}
    className="relative overflow-hidden w-full rounded-2xl p-5 text-left text-primary-foreground shadow-fab"
    style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)" }}
  >
    {/* Decorative blobs */}
    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" aria-hidden="true" />
    <div className="absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-white/5 blur-2xl pointer-events-none" aria-hidden="true" />

    <div className="relative">
      {/* Top row: DANAS + partition chip */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1">
          <Sparkles size={ICON_SIZE.xs} aria-hidden="true" />
          <span className="text-caption-1 font-semibold uppercase tracking-wider">Danas</span>
        </div>
        <span className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 ring-1 ring-white/30">
          <span className="text-caption-1 font-bold">{PARTITION_CHIP_LABEL[partition]}</span>
        </span>
      </div>

      {/* Title */}
      <h2 className="text-title-1 font-bold leading-tight">{title}</h2>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-primary-foreground/90">
        <div className="flex items-center gap-2">
          <Clock size={ICON_SIZE.xs} aria-hidden="true" />
          <span className="text-footnote font-medium">{durationMin} min</span>
        </div>
        <span className="w-1 h-1 rounded-full bg-white/50" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <Dumbbell size={ICON_SIZE.xs} aria-hidden="true" />
          <span className="text-footnote font-medium">{intensity}</span>
        </div>
      </div>

      {/* CTA — glass effect unutar gradient card-a */}
      <div className="flex items-center gap-3 mt-5 bg-white/15 backdrop-blur-sm rounded-2xl p-3 ring-1 ring-white/20">
        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center ring-1 ring-white/40">
          <Play size={16} fill="currentColor" className="ml-0.5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-body font-bold">Započni trening</p>
          <p className="text-caption-1 opacity-85">Hajde da krenemo</p>
        </div>
        <ChevronRight size={20} aria-hidden="true" />
      </div>
    </div>
  </button>
);

// ============================================================================
// RestDayHero — tihi card sa Moon ikonom (kao AnalysisReport tihi card stil)
// ============================================================================

const RestDayHero = ({ nextSessionLabel }: { nextSessionLabel: string | null }) => (
  <Card className="p-5">
    {/* Top row: DANAS chip + Moon icon chip (uniform sa TodayTrainingHero) */}
    <div className="flex items-center justify-between mb-3">
      <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1">
        <Sparkles size={ICON_SIZE.xs} aria-hidden="true" />
        <span className="text-caption-1 font-semibold uppercase tracking-wider">Danas</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center breathe">
        <Moon size={16} className="text-primary" aria-hidden="true" />
      </div>
    </div>

    {/* Title */}
    <h2 className="text-title-1 font-bold text-foreground leading-tight">
      Dan za oporavak
    </h2>

    {/* Body — suptilni opis */}
    <p className="text-footnote text-muted-foreground mt-2 leading-relaxed">
      Telo se gradi dok se odmaraš. Fokus na san, hidraciju i protein.
    </p>

    {/* Tip box */}
    <div className="flex items-center gap-2 mt-4 bg-primary/8 rounded-xl px-4 py-3">
      <Droplets size={16} className="text-primary shrink-0" aria-hidden="true" />
      <p className="text-caption-1 text-foreground">
        Danas popij bar 2L vode i ciljaj 8+ sati sna.
      </p>
    </div>

    {/* Sledeći trening (opcionalno) */}
    {nextSessionLabel && (
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
        <div className="min-w-0">
          <p className="text-caption-1 text-muted-foreground">Sledeći trening</p>
          <p className="text-body font-semibold text-foreground mt-0.5 truncate">{nextSessionLabel}</p>
        </div>
        <ChevronRight size={ICON_SIZE.md} className="text-muted-foreground/40 shrink-0" aria-hidden="true" />
      </div>
    )}
  </Card>
);

// ============================================================================
// WeeklyStripBrand — Lovable dizajn + naša logika
// ============================================================================
//
// Lovable dizajn: sliding bela kartica (layoutId spring animation), SVG ring
// 40×40 oko broja za today (solid) i past (dashed), future muted/25 bez kruga.
// Naša logika: WeekDayMinimal tip, isCompleted/isTraining state iz kind union-a,
// completed = gradient primary filled sa check (pozitivan signal, override dashed).
// ============================================================================

type WeekDayKind = { type: 'training'; session: { partition?: string; status?: string } } | { type: 'rest' };

interface WeekDayMinimal {
  dayLabel: string;
  dayNumber: number;
  isToday: boolean;
  isPast: boolean;
  kind: WeekDayKind;
  isShifted?: boolean;
}

const WeeklyStripBrand = ({ days }: { days: WeekDayMinimal[] }) => {
  const { t } = useLanguage();
  // Grid 7 kolona — ravnomerno raspoređeni dani (ne flex justify-between)
  return (
    <div className="grid grid-cols-7 gap-0" role="list" aria-label={t("a11y.week")}>
      {days.map((day, i) => (
        <WeekCircle key={i} day={day} />
      ))}
    </div>
  );
};

const WeekCircle = ({ day }: { day: WeekDayMinimal }) => {
  const isTraining = day.kind.type === 'training';
  const session = isTraining ? (day.kind as { type: 'training'; session: { status?: string } }).session : null;
  const isCompleted = isTraining && session?.status === 'completed';
  const isToday = day.isToday;
  const isSelected = isToday;                 // default selection = today
  const isPast = day.isPast && !isToday;
  const isFuture = !day.isPast && !isToday;

  return (
    <div
      role="listitem"
      className="relative flex flex-col items-center py-2 gap-1"
      aria-label={`${day.dayLabel} ${day.dayNumber}${isToday ? ' · danas' : ''}${isCompleted ? ' · završen' : ''}`}
    >
      {/* Sliding bela kartica — layoutId magic iz Lovable spec-a */}
      {isSelected && (
        <motion.div
          layoutId="weekstrip-selected"
          className="absolute inset-x-1 inset-y-0 rounded-[16px] bg-card shadow-hairline"
          transition={IOS_SPRING.precise}
          aria-hidden="true"
        />
      )}

      {/* Day label */}
      <span
        className={`relative z-10 text-caption-2 tracking-wide ${
          isSelected
            ? 'font-semibold text-foreground'
            : isFuture
              ? 'text-muted-foreground/50 font-medium'
              : 'text-muted-foreground font-medium'
        }`}
      >
        {day.dayLabel}
      </span>

      {/* Datum sa SVG krugom */}
      <div className="relative z-10 flex items-center justify-center w-10 h-10">
        {/* Completed (past + trening završen): gradient filled circle + check */}
        {isCompleted ? (
          <>
            <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0" aria-hidden="true">
              <defs>
                <linearGradient id="week-completed-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="16" fill="url(#week-completed-grad)" />
            </svg>
            <Check size={ICON_SIZE.xs} strokeWidth={3} className="relative text-primary-foreground" aria-hidden="true" />
          </>
        ) : (
          <>
            {/* SVG krug — solid za selected/today, dashed za past */}
            {(isSelected || isPast) && (
              <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0" aria-hidden="true">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1.5"
                  opacity="0.3"
                  strokeDasharray={isPast ? "4 3" : undefined}
                />
              </svg>
            )}
            <span
              className={`relative text-subhead font-semibold tabular-nums ${
                isFuture ? 'text-muted-foreground/50' : 'text-foreground'
              }`}
            >
              {day.dayNumber}
            </span>
          </>
        )}

        {/* Shifted indicator — diskretan warning dot (ne menja dashed logiku) */}
        {day.isShifted && !isCompleted && (
          <span
            className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-warning ring-2 ring-card"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// BioFeedbackRings — brand colors (warning/success/info umesto custom)
// ============================================================================

interface BioRingsProps {
  steps: { current: number; goal: number };
  activity: { current: number; goal: number };
  hydration: { current: number; goal: number };
}

const BioFeedbackRings = ({ steps, activity, hydration }: BioRingsProps) => (
  <div className="grid grid-cols-3 gap-3">
    <RingMetric
      ringColor="hsl(var(--warning))"
      value={steps.current}
      goal={steps.goal}
      icon={<Footprints size={16} className="text-warning" aria-hidden="true" />}
      label="Koraci"
      display={`${(steps.current / 1000).toFixed(1)}k`}
    />
    <RingMetric
      ringColor="hsl(var(--success))"
      value={activity.current}
      goal={activity.goal}
      icon={<Activity size={16} className="text-success" aria-hidden="true" />}
      label="Aktivnost"
      display={`${activity.current}m`}
    />
    <RingMetric
      ringColor="hsl(var(--info))"
      value={hydration.current}
      goal={hydration.goal}
      icon={<Droplets size={16} className="text-info" aria-hidden="true" />}
      label="Hidracija"
      display={`${Math.round(hydration.current / 100) / 10}L`}
    />
  </div>
);

interface RingMetricProps {
  ringColor: string;
  value: number;
  goal: number;
  icon: React.ReactNode;
  label: string;
  display: string;
}

const RING_SIZE = 72;
const RING_STROKE = 6;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

const RingMetric = ({ ringColor, value, goal, icon, label, display }: RingMetricProps) => {
  const pct = Math.min(1, value / goal);
  const dashOffset = RING_CIRC * (1 - pct);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="-rotate-90" aria-hidden="true">
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} fill="none" stroke="hsl(var(--muted))" strokeWidth={RING_STROKE} />
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            fill="none"
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            initial={{ strokeDashoffset: RING_CIRC }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: MOTION_DURATION.xSlow, ease: [0.25, 1, 0.5, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-caption-1 text-muted-foreground font-medium mt-2">{label}</p>
      <p className="text-footnote font-bold text-foreground tabular-nums mt-0.5">{display}</p>
    </div>
  );
};

// ============================================================================
// FuelingSection — % gorivo bar + 3 macro rings (brand boje)
// ============================================================================

interface FuelingSectionProps {
  kcalCurrent: number;
  kcalGoal: number;
  fuelPct: number;
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
}

const FuelingSection = ({ kcalCurrent, kcalGoal, fuelPct, protein, carbs, fat }: FuelingSectionProps) => (
  <div>
    {/* Header: naslov levo (sa % ispod) + kcal counter desno */}
    <div className="flex items-end justify-between mb-4">
      <div>
        <p className="text-caption-1 text-muted-foreground uppercase tracking-wider font-semibold">
          Dnevni unos kalorija
        </p>
        <p className="text-title-1 font-bold text-foreground tabular-nums leading-none mt-2">
          {fuelPct}%
        </p>
      </div>
      <p className="text-body font-bold text-foreground tabular-nums">
        {kcalCurrent.toLocaleString()}
        <span className="text-caption-1 font-medium text-muted-foreground"> / {kcalGoal.toLocaleString()} kcal</span>
      </p>
    </div>

    {/* Progress bar */}
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-6">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${fuelPct}%` }}
        transition={{ duration: MOTION_DURATION.xSlow, ease: [0.25, 1, 0.5, 1] }}
        className="h-full rounded-full gradient-primary"
      />
    </div>

    {/* 3 macro rings sa ikonama u centru (uniform sa Tvoje stanje) */}
    <div className="grid grid-cols-3 gap-3">
      <MacroRing
        ringColor="hsl(var(--destructive))"
        current={protein.current}
        goal={protein.goal}
        label="Protein"
        icon={<Drumstick size={ICON_SIZE.md} className="text-destructive" aria-hidden="true" />}
      />
      <MacroRing
        ringColor="hsl(var(--warning))"
        current={carbs.current}
        goal={carbs.goal}
        label="Ugljeni"
        icon={<Wheat size={ICON_SIZE.md} className="text-warning" aria-hidden="true" />}
      />
      <MacroRing
        ringColor="hsl(var(--success))"
        current={fat.current}
        goal={fat.goal}
        label="Masti"
        icon={<AvocadoIcon size={ICON_SIZE.md} className="text-success" aria-hidden="true" />}
      />
    </div>
  </div>
);

// ============================================================================
// AvocadoIcon — custom SVG (lucide nema avokado), stroke stil kao ostale ikone
// ============================================================================

interface AvocadoIconProps {
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

const AvocadoIcon = ({ size = 24, className, ...props }: AvocadoIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Stabljika + listić na vrhu */}
    <path d="M12 2.5c.3 1.4-.4 2.6-1.5 3M13.5 2c.8.8.3 2.4-.9 3" />
    {/* Avokado oblik (pear) */}
    <path d="M12 5c-3.3 0-5.8 2.8-5.8 6.2 0 2 .7 3.6 1.7 4.8.8 1 1.5 2.3 1.5 3.5 0 1.4.7 2 2.6 2s2.6-.6 2.6-2c0-1.2.7-2.5 1.5-3.5 1-1.2 1.7-2.8 1.7-4.8 0-3.4-2.5-6.2-5.8-6.2z" />
    {/* Seme */}
    <ellipse cx="12" cy="13" rx="2.2" ry="3" />
  </svg>
);

const MACRO_RING = 72;
const MACRO_STROKE = 6;
const MACRO_R = (MACRO_RING - MACRO_STROKE) / 2;
const MACRO_CIRC = 2 * Math.PI * MACRO_R;

const MacroRing = ({
  ringColor, current, goal, label, icon,
}: {
  ringColor: string;
  current: number;
  goal: number;
  label: string;
  icon: React.ReactNode;
}) => {
  const pct = Math.min(1, current / goal);
  const dashOffset = MACRO_CIRC * (1 - pct);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: MACRO_RING, height: MACRO_RING }}>
        <svg width={MACRO_RING} height={MACRO_RING} viewBox={`0 0 ${MACRO_RING} ${MACRO_RING}`} className="-rotate-90" aria-hidden="true">
          <circle cx={MACRO_RING / 2} cy={MACRO_RING / 2} r={MACRO_R} fill="none" stroke="hsl(var(--muted))" strokeWidth={MACRO_STROKE} />
          <motion.circle
            cx={MACRO_RING / 2}
            cy={MACRO_RING / 2}
            r={MACRO_R}
            fill="none"
            stroke={ringColor}
            strokeWidth={MACRO_STROKE}
            strokeLinecap="round"
            strokeDasharray={MACRO_CIRC}
            initial={{ strokeDashoffset: MACRO_CIRC }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: MOTION_DURATION.xSlow, ease: [0.25, 1, 0.5, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-caption-1 text-muted-foreground font-medium mt-2">{label}</p>
      <p className="text-footnote font-bold text-foreground tabular-nums mt-0.5">
        {current}
        <span className="text-muted-foreground font-medium"> / {goal} g</span>
      </p>
    </div>
  );
};

// ============================================================================
// Helpers
// ============================================================================

function humanWorkoutTitle(label: string, partition: Partition): string {
  const map: Record<string, string> = {
    "Lower — Tension": "Čvrste noge i zadnjica",
    "Lower — Pump": "Glute burn",
    "Lower — Heavy": "Snažne noge",
    "Lower — Light": "Laki donji deo",
    "Lower — Stretch": "Istezanje i fleksibilnost",
    "Upper — Heavy": "Jake ruke i leđa",
    "Upper — Tension": "Gornji deo u snazi",
    "Upper — Light": "Aktivni gornji deo",
    "Upper — Pump": "Ruke u punoj formi",
    "Full Body": "Kompletan trening",
  };
  if (map[label]) return map[label];
  if (partition === 'Lower') return "Trening za noge i zadnjicu";
  if (partition === 'Upper') return "Trening za gornji deo";
  return "Kompletan trening";
}

function humanIntensity(label: string): string {
  if (label.includes('Heavy')) return "Visoko";
  if (label.includes('Tension')) return "Srednje";
  if (label.includes('Pump')) return "Srednje";
  if (label.includes('Light')) return "Lako";
  if (label.includes('Stretch')) return "Lako";
  return "Srednje";
}

function countCompleted(days: { kind: WeekDayKind }[]): number {
  return days.filter(d => d.kind.type === 'training' && (d.kind as { session: { status?: string } }).session?.status === 'completed').length;
}

function countTrainingDays(days: { kind: WeekDayKind }[]): number {
  return days.filter(d => d.kind.type === 'training').length;
}

function fallbackWeekDays(): WeekDayMinimal[] {
  const labels = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return labels.map((dayLabel, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      dayLabel,
      dayNumber: d.getDate(),
      isToday: d.toDateString() === now.toDateString(),
      isPast: d < now,
      kind: { type: 'rest' },
    };
  });
}

export default Home;
