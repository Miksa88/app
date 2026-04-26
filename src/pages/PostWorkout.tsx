// ============================================================================
// PostWorkout — "trening gotov" summary + reco
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 7 (posle process-workout-completion)
// ============================================================================
//
// IT-9: zamena hardkodovanih stat-ova sa realnim agregatima iz
// exercise_progress (danasnji setovi):
//   - Total sets (broj redova za clientId za today)
//   - Total volume (Σ weight × reps)
//   - Distinct exercises
//
// Trajanje (duration) i kalorije ostaju placeholder — nemamo jos tracker za
// elapsed time preko navigate-a; te statistike trebaju reducere na nivou
// useActiveWorkoutSession ili Workout sesije — van scope-a IT-9.
// ============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import GradientButton from "@/components/GradientButton";
import { Flame, Clock, Dumbbell, Star, PartyPopper } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";
import { MOTION_DURATION, MOTION_EASE, IOS_SPRING } from "@/lib/motion";
import { supabase } from "@/integrations/supabase/client";

interface ProgressRow {
  exercise_id: string;
  weight_kg: number;
  reps: number;
  set_number: number;
  completed_at: string;
}

async function loadTodaySets(clientId: string): Promise<ProgressRow[]> {
  // Dan u ISO format: pocetak lokalnog dana u UTC (jednostavno — last 24h).
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("exercise_progress")
    .select("exercise_id, weight_kg, reps, set_number, completed_at")
    .eq("user_id", clientId)
    .gte("completed_at", since.toISOString())
    .order("completed_at", { ascending: true });

  if (error) throw new Error(`loadTodaySets: ${error.message}`);
  return (data ?? []).map((r) => ({
    exercise_id: r.exercise_id,
    weight_kg: Number(r.weight_kg),
    reps: r.reps,
    set_number: r.set_number,
    completed_at: r.completed_at,
  }));
}

const PostWorkout = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();

  const { data: rows = [] } = useQuery<ProgressRow[], Error>({
    queryKey: ["postWorkoutTodaySets", clientId],
    enabled: Boolean(clientId),
    queryFn: () => loadTodaySets(clientId as string),
  });

  const summary = useMemo(() => {
    const totalSets = rows.length;
    const totalVolume = rows.reduce((acc, r) => acc + r.weight_kg * r.reps, 0);
    const distinctExercises = new Set(rows.map((r) => r.exercise_id)).size;
    return {
      totalSets,
      totalVolume: Math.round(totalVolume),
      distinctExercises,
    };
  }, [rows]);

  const stats = [
    {
      icon: Dumbbell,
      label: t("postWorkout.volume"),
      value: summary.totalVolume.toLocaleString(),
      unit: "kg",
    },
    {
      icon: Star,
      label: t("gym.sets"),
      value: String(summary.totalSets),
      unit: "",
    },
    {
      icon: Flame,
      label: t("postWorkout.calories"),
      value: "—",
      unit: "kcal",
    },
    {
      icon: Clock,
      label: t("postWorkout.duration"),
      value: "—",
      unit: t("home.min"),
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-6">
      <ConfettiCelebration />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.easeOut }}
        className="text-center z-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, ...IOS_SPRING.bouncy }}
          className="mb-4 flex items-center justify-center"
          aria-hidden="true"
        >
          <PartyPopper size={64} className="text-primary" strokeWidth={1.5} />
        </motion.div>
        <h1 className="text-large-title text-foreground mb-2">
          {t("postWorkout.complete")}
        </h1>
        <p className="text-muted-foreground text-subhead italic">
          {t("postWorkout.motivation")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: MOTION_DURATION.slow }}
        className="grid grid-cols-2 gap-3 mt-10 w-full max-w-sm z-10"
      >
        {stats.map(({ icon: Icon, label, value, unit }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="bg-card rounded-xl p-4 text-center card-shadow"
          >
            <Icon size={20} className="text-primary mx-auto mb-2" />
            <p className="text-title-1 text-foreground">{value}</p>
            <p className="text-footnote text-muted-foreground">{unit}</p>
            <p className="text-caption-2 text-muted-foreground mt-1">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {summary.distinctExercises > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-footnote text-muted-foreground z-10"
        >
          {summary.distinctExercises} {t("gym.exercises")}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-10 w-full max-w-sm z-10 space-y-3"
      >
        <GradientButton onClick={() => navigate("/home")} className="w-full" size="lg">
          {t("postWorkout.backToHome")}
        </GradientButton>
      </motion.div>
    </div>
  );
};

export default PostWorkout;
