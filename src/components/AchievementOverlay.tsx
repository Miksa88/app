// AchievementOverlay — full-screen celebration na streak milestone crossing
// Spec: design-system/MASTER.md + WS-8 G10 (Habit Tracker rule iz ui-ux-pro-max row 94)
//
// Usage:
//   const [milestone, setMilestone] = useState<AchievementMilestone | null>(null);
//   <AchievementOverlay milestone={milestone} onDismiss={() => setMilestone(null)} />
//
// Trigger patterns (skill pack):
//   - streak 3 → "Rookie" badge earn
//   - streak 10 → "Getting Serious"
//   - streak 50 → "Locked In"
//   - streak 100 → "Triple Threat"
//   - streak 365 → "No Days Off"

import { motion, AnimatePresence } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { useHaptic } from "@/hooks/useHaptic";
import { IOS_SPRING, shouldReduceMotion } from "@/lib/motion";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";

export interface AchievementMilestone {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Gradient class override (default: gradient-primary) */
  iconGradient?: string;
}

interface Props {
  milestone: AchievementMilestone | null;
  onDismiss: () => void;
  /** Auto-dismiss after N ms (default 3500). 0 = manual only. */
  autoDismissMs?: number;
}

export const AchievementOverlay = ({
  milestone,
  onDismiss,
  autoDismissMs = 3500,
}: Props) => {
  const haptic = useHaptic();
  const reduce = shouldReduceMotion();

  useEffect(() => {
    if (!milestone) return;

    haptic("success");

    if (autoDismissMs > 0) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [milestone, autoDismissMs, haptic, onDismiss]);

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.01 : 0.25 }}
          onClick={onDismiss}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl cursor-pointer"
        >
          {/* Radial glow backdrop */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, hsl(var(--primary) / 0.35) 0%, transparent 60%)",
            }}
            aria-hidden="true"
          />

          {/* Confetti burst (respektuje reduced-motion interno) — WS-8 D15 */}
          <ConfettiCelebration count={30} delayMax={0.5} />

          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0, rotate: -8 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            transition={reduce ? { duration: 0.01 } : IOS_SPRING.bouncy}
            className="relative bg-card rounded-3xl p-8 mx-5 max-w-xs text-center card-shadow"
          >
            {/* Badge icon */}
            <motion.div
              initial={reduce ? {} : { scale: 0 }}
              animate={reduce ? {} : { scale: 1 }}
              transition={reduce ? { duration: 0.01 } : { ...IOS_SPRING.bouncy, delay: 0.15 }}
              className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                milestone.iconGradient ?? "gradient-primary"
              } shadow-fab`}
            >
              <milestone.icon size={48} className="text-primary-foreground" aria-hidden="true" />
            </motion.div>

            <p
              id="achievement-title"
              className="text-caption-1 text-primary font-bold uppercase tracking-wider mb-1"
            >
              Nova nagrada
            </p>
            <h2 className="text-title-1 font-bold text-foreground mb-2">{milestone.title}</h2>
            {milestone.description && (
              <p className="text-footnote text-muted-foreground leading-relaxed">
                {milestone.description}
              </p>
            )}

            <button
              onClick={onDismiss}
              className="mt-5 w-full min-h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-subhead active:brightness-95 transition-all"
            >
              Super!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
