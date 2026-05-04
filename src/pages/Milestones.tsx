import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { motion } from "framer-motion";
import { Flame, Trophy, Share2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/contexts/AuthContext";
import { useStreak } from "@/hooks/useStreak";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useMesocycleQueue } from "@/hooks/useMesocycleQueue";
import { supabase } from "@/integrations/supabase/client";

const STREAK_BADGES = [
  { name: "Rookie", desc: "3 day streak", requirement: 3, icon: "🔥" },
  { name: "Getting Serious", desc: "10 day streak", requirement: 10, icon: "🔥" },
  { name: "Locked In", desc: "50 day streak", requirement: 50, icon: "🔥" },
  { name: "Triple Threat", desc: "100 day streak", requirement: 100, icon: "💪" },
  { name: "No Days Off", desc: "365 day streak", requirement: 365, icon: "⚡" },
  { name: "Immortal", desc: "1000 day streak", requirement: 1000, icon: "👑" },
];

const MEAL_BADGES = [
  { name: "Forking Around", desc: "Logged 5 meals", requirement: 5, icon: "🥗" },
  { name: "Mission: Nutrition", desc: "Logged 50 meals", requirement: 50, icon: "🍲" },
  { name: "The Logfather", desc: "Logged 500 meals", requirement: 500, icon: "🏆" },
];

const WORKOUT_BADGES = [
  { name: "First Rep", desc: "Complete 1 workout", requirement: 1, icon: "💪" },
  { name: "Sweat Equity", desc: "Complete 5 workouts", requirement: 5, icon: "🏋️" },
  { name: "Beast Mode", desc: "Complete 25 workouts", requirement: 25, icon: "🔥" },
  { name: "Iron Will", desc: "Complete 50 workouts", requirement: 50, icon: "⚡" },
  { name: "Legend", desc: "Complete 100 workouts", requirement: 100, icon: "👑" },
];

const WEIGHT_BADGES = [
  { name: "First Drop", desc: "Lose 1 kg", requirement: 1, icon: "⚖️" },
  { name: "Bye Bye Burrito", desc: "Lose 5 kg", requirement: 5, icon: "🎯" },
  { name: "Scale Tipper", desc: "Lose 10 kg", requirement: 10, icon: "🏅" },
  { name: "Heavy Exit", desc: "Lose 25 kg", requirement: 25, icon: "🚀" },
  { name: "Final Form", desc: "Lose 50 kg", requirement: 50, icon: "💎" },
];

const WATER_BADGES = [
  { name: "Hydrated", desc: "Log water once", requirement: 1, icon: "💧" },
  { name: "Sippin'", desc: "Log water 3 days in a row", requirement: 3, icon: "💧" },
  { name: "Aquaholic", desc: "Log water 10 days in a row", requirement: 10, icon: "🌊" },
];

const Milestones = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { data: streak = 0 } = useStreak(clientId);
  const { status } = useUserStatus(clientId);
  const { queue } = useMesocycleQueue(clientId);

  // Aggregate counts from real DB (meal_logs + water_logs); 30-day window.
  const [mealsLogged, setMealsLogged] = useState(0);
  const [waterDays, setWaterDays] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();

      const [meals, waters] = await Promise.all([
        supabase
          .from("meal_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", clientId)
          .eq("status", "logged")
          .gte("logged_at", sinceIso),
        supabase
          .from("water_logs")
          .select("logged_at")
          .eq("user_id", clientId)
          .gte("logged_at", sinceIso),
      ]);
      if (cancelled) return;
      setMealsLogged(meals.count ?? 0);
      const distinctDays = new Set(
        (waters.data ?? []).map(r => (r.logged_at as string).slice(0, 10)),
      ).size;
      setWaterDays(distinctDays);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const workoutsCompleted = queue?.sessions.filter(s => s.status === "completed").length ?? 0;
  const initialWeight = (status?.bio.currentWeightMA5 ?? 0) + (status?.bio.weeklyWeightDelta ?? 0);
  const weightLost = Math.max(0, initialWeight - (status?.bio.currentWeightMA5 ?? 0));

  const ALL_BADGES = [
    ...STREAK_BADGES.map(b => ({ ...b, category: "streak", progress: streak })),
    ...WORKOUT_BADGES.map(b => ({ ...b, category: "workout", progress: workoutsCompleted })),
    ...MEAL_BADGES.map(b => ({ ...b, category: "meals", progress: mealsLogged })),
    ...WATER_BADGES.map(b => ({ ...b, category: "water", progress: waterDays })),
    ...WEIGHT_BADGES.map(b => ({ ...b, category: "weight", progress: weightLost })),
  ];

  const earnedCount = ALL_BADGES.filter(b => b.progress >= b.requirement).length;
  const totalCount = ALL_BADGES.length;

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageHeader
        title={t("milestones.title")}
        onBack={() => navigate(-1)}
        backLabel={t("nav.home")}
        hideInlineTitle={false}
        rightAction={
          <button
            aria-label="Share"
            className="p-2 min-w-11 min-h-11 flex items-center justify-center text-primary active:opacity-60"
          >
            <Share2 size={20} aria-hidden="true" />
          </button>
        }
      />

      <div className="px-5 pt-3">

        {/* Streak & Badges Summary */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 gap-4 mb-4">
          <StatCard
            layout="centered"
            icon={<Flame size={44} aria-hidden="true" />}
            iconColor="text-warning"
            value={streak}
            label={t("milestones.dayStreak")}
          />
          <StatCard
            layout="centered"
            icon={<Trophy size={40} aria-hidden="true" />}
            iconColor="text-primary"
            value={earnedCount}
            label={t("milestones.badgesEarned")}
          />
        </motion.div>

        {/* Summary stats */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex gap-3 mb-6">
          <div className="flex-1 bg-card rounded-xl px-4 py-3 card-shadow flex items-center gap-2">
            <Flame size={16} className="text-warning" />
            <div>
              <p className="text-headline font-bold text-foreground">{streak} {t("milestones.days")}</p>
              <p className="text-caption-2 text-muted-foreground">{t("milestones.longestStreak")}</p>
            </div>
          </div>
          <div className="flex-1 bg-card rounded-xl px-4 py-3 card-shadow flex items-center gap-2">
            <Trophy size={16} className="text-primary" />
            <div>
              <p className="text-headline font-bold text-foreground">{earnedCount}/{totalCount}</p>
              <p className="text-caption-2 text-muted-foreground">{t("milestones.badges")}</p>
            </div>
          </div>
        </motion.div>

        {/* Badge Sections */}
        {[
          { title: t("milestones.streakBadges"), badges: STREAK_BADGES, progress: streak },
          { title: t("milestones.workoutBadges"), badges: WORKOUT_BADGES, progress: workoutsCompleted },
          { title: t("milestones.mealBadges"), badges: MEAL_BADGES, progress: mealsLogged },
          { title: t("milestones.waterBadges"), badges: WATER_BADGES, progress: waterDays },
          { title: t("milestones.weightBadges"), badges: WEIGHT_BADGES, progress: weightLost },
        ].map(({ title, badges, progress }, sectionIdx) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + sectionIdx * 0.05 }}
            className="mb-6"
          >
            <h2 className="text-subhead font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h2>
            <div className="grid grid-cols-3 gap-3">
              {badges.map((badge, bIdx) => {
                const earned = progress >= badge.requirement;
                return (
                  <motion.div
                    key={badge.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + bIdx * 0.035, ...IOS_SPRING.snappy }}
                    whileTap={{ scale: TAP_SCALE.secondary }}
                    role="img"
                    aria-label={`${badge.name}: ${badge.desc}. ${earned ? t("milestones.earned") : t("milestones.locked")}`}
                    className={`flex flex-col items-center p-3 rounded-2xl transition-all ${
                      earned
                        ? "bg-card card-shadow"
                        : "bg-card/50 opacity-50"
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                      earned
                        ? "bg-gradient-to-br from-primary/20 to-warning/20 border-2 border-primary/30"
                        : "bg-muted border-2 border-border"
                    }`}>
                      <span className={`text-2xl ${earned ? "" : "grayscale"}`} aria-hidden="true">{badge.icon}</span>
                    </div>
                    <p className={`text-caption-1 font-semibold text-center leading-tight ${
                      earned ? "text-foreground" : "text-muted-foreground"
                    }`}>{badge.name}</p>
                    <p className="text-caption-2 text-muted-foreground text-center mt-0.5">{badge.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Milestones;
