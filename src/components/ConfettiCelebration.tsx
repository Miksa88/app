// ConfettiCelebration — confetti burst za WeeklyCheckIn (mezo / weekly milestones).
// V3 §1: confetti samo na mezo-end / weekly milestone, nikad na svaku akciju.
// Spec: WS-8 D7 + D15 — reduced-motion guard (WCAG SC 2.3.3).
//
// Boje koriste CSS vars (design tokens), ne hex literale.

import { motion } from "framer-motion";
import { shouldReduceMotion } from "@/lib/motion";

// Token-based confetti palette (no raw hex)
const CONFETTI_CLASSES = [
  "bg-primary",
  "bg-secondary",
  "bg-warning",
  "bg-success",
  "bg-info",
];

interface Props {
  /** Number of confetti particles (default 40 for PostWorkout) */
  count?: number;
  /** Delay max before particle starts (default 0.8s) */
  delayMax?: number;
}

export const ConfettiCelebration = ({ count = 40, delayMax = 0.8 }: Props) => {
  // Respect reduced-motion — silently render nothing
  if (shouldReduceMotion()) {
    return null;
  }

  // SSR safety: window undefined at module level → useMemo during render
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * vw,
            y: -20,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: vh + 20,
            rotate: Math.random() * 720 - 360,
            opacity: 0,
          }}
          transition={{
            duration: 2.5 + Math.random() * 2,
            delay: Math.random() * delayMax,
            ease: "easeIn",
          }}
          className={`absolute w-2 h-3 rounded-sm pointer-events-none ${
            CONFETTI_CLASSES[i % CONFETTI_CLASSES.length]
          }`}
          style={{
            left: `${Math.random() * 100}%`,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};
