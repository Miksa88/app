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

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import GradientButton from "@/components/GradientButton";
import { Flame, Clock, Dumbbell, Star, PartyPopper } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { MOTION_DURATION, MOTION_EASE, IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

type PerceivedDifficulty = 'easy' | 'just_right' | 'hard';

// pump_score reuse: easy=8 (high pump = recovered), just_right=5, hard=2 (low pump = under-recovered).
// biofeedbackReactiveRules reads pump<5 → +salt/water sledeći trening.
const DIFFICULTY_TO_PUMP_SCORE: Record<PerceivedDifficulty, number> = {
  easy: 8,
  just_right: 5,
  hard: 2,
};

async function saveDifficulty(clientId: string, difficulty: PerceivedDifficulty): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const pumpScore = DIFFICULTY_TO_PUMP_SCORE[difficulty];

  // 1. Snimi u daily_check_ins (audit log)
  const { error: ciErr } = await supabase
    .from('daily_check_ins')
    .upsert(
      { user_id: clientId, date: today, pump_score: pumpScore },
      { onConflict: 'user_id,date' },
    );
  if (ciErr) throw new Error(`saveDifficulty check-in: ${ciErr.message}`);

  // 2. Patchuj user_status.bio — latestPumpScore + consecutiveHardWorkouts.
  // applyBiofeedbackReactiveRules čita pump score; programGenerator čita
  // consecutiveHardWorkouts za auto-decrement volumena kad je 2+ "Teško".
  const { data: row, error: readErr } = await supabase
    .from('user_status')
    .select('status_json')
    .eq('client_id', clientId)
    .single();
  if (readErr) throw new Error(`saveDifficulty status read: ${readErr.message}`);

  const status = (row?.status_json ?? {}) as Record<string, unknown>;
  const bio = (status.bio ?? {}) as Record<string, unknown>;
  const prevHardCount = (bio.consecutiveHardWorkouts as number | undefined) ?? 0;
  const isHard = difficulty === 'hard';
  const newStatus = {
    ...status,
    bio: {
      ...bio,
      latestPumpScore: pumpScore,
      consecutiveHardWorkouts: isHard ? prevHardCount + 1 : 0,
    },
  };
  const { error: writeErr } = await supabase
    .from('user_status')
    .update({ status_json: newStatus, last_updated_at: new Date().toISOString() })
    .eq('client_id', clientId);
  if (writeErr) throw new Error(`saveDifficulty status write: ${writeErr.message}`);
}

const PostWorkout = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const [difficulty, setDifficulty] = useState<PerceivedDifficulty | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: rows = [] } = useQuery<ProgressRow[], Error>({
    queryKey: ["postWorkoutTodaySets", clientId],
    enabled: Boolean(clientId),
    queryFn: () => loadTodaySets(clientId as string),
  });

  const handleDifficulty = async (choice: PerceivedDifficulty) => {
    if (!clientId || submitting) return;
    setDifficulty(choice);
    setSubmitting(true);
    try {
      await saveDifficulty(clientId, choice);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Greška pri snimanju');
      setDifficulty(null);
    } finally {
      setSubmitting(false);
    }
  };

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

      {/* Kako je bio trening? — 3-tap feedback (Lako/Taman/Teško) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="mt-10 w-full max-w-sm z-10"
      >
        <p className="text-subhead font-semibold text-foreground text-center mb-3">
          Kako je bio trening?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'easy' as const, label: 'Lako', emoji: '😌' },
            { key: 'just_right' as const, label: 'Taman', emoji: '😊' },
            { key: 'hard' as const, label: 'Teško', emoji: '😤' },
          ]).map((opt) => {
            const isSelected = difficulty === opt.key;
            return (
              <motion.button
                key={opt.key}
                whileTap={{ scale: TAP_SCALE.primary }}
                onClick={() => handleDifficulty(opt.key)}
                disabled={submitting || difficulty !== null}
                aria-pressed={isSelected}
                aria-label={`${opt.label} — kako je bio trening`}
                className={`min-h-[88px] rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'gradient-primary text-primary-foreground border-transparent shadow-fab'
                    : 'bg-card text-foreground border-transparent card-shadow hover:border-primary/30'
                } ${difficulty !== null && !isSelected ? 'opacity-40' : ''}`}
              >
                <span className="text-2xl" aria-hidden="true">{opt.emoji}</span>
                <span className="text-footnote font-semibold">{opt.label}</span>
              </motion.button>
            );
          })}
        </div>
        {difficulty !== null && (
          <p className="text-caption-2 text-muted-foreground text-center mt-2">
            Sledeći trening će biti prilagođen.
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-6 w-full max-w-sm z-10 space-y-3"
      >
        <GradientButton onClick={() => navigate("/home")} className="w-full" size="lg">
          {t("postWorkout.backToHome")}
        </GradientButton>
      </motion.div>
    </div>
  );
};

export default PostWorkout;
