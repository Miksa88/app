// ============================================================================
// motion.ts — helperi za Framer Motion + prefers-reduced-motion respect
// Spec: Faza 1 Design Harmonization (DESIGN_AUDIT.md fix A7 + H7)
// ============================================================================
//
// Centralno mesto za animation konstante kroz app. Svaka sa reduce-motion
// fallback-om. Ne duplirati `fadeUp` helper po pages — importuj odavde.
// ============================================================================

import type { Transition, Variants, TargetAndTransition } from 'framer-motion';

// ----------------------------------------------------------------------------
// prefers-reduced-motion detect — SSR-safe
// ----------------------------------------------------------------------------

export const shouldReduceMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// ----------------------------------------------------------------------------
// Duration i easing tokeni (iOS-inspired)
// ----------------------------------------------------------------------------

export const MOTION_DURATION = {
  fast: 0.15,     // 150ms — buttons, small state changes
  base: 0.25,     // 250ms — modals, transitions
  slow: 0.4,      // 400ms — page transitions, hero reveals
  xSlow: 0.8,     // 800ms — progress bar fills, width reveal animacije
  spring: 0.35,   // 350ms — gentle spring (fadeUp default)
} as const;

export const MOTION_EASE = {
  outQuart: [0.25, 1, 0.5, 1] as [number, number, number, number],
  springGentle: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  easeOut: 'easeOut' as const,
  easeInOut: 'easeInOut' as const,
  linear: 'linear' as const,
  // Apple UIKit default curves (iOS-native feel)
  iosDefault: [0.32, 0.72, 0, 1] as [number, number, number, number], // easeOutExpo
  iosSpring: [0.5, 1.5, 0.5, 1] as [number, number, number, number],
  // Apple HIG signature ease curves
  // Mek ulaz, čist izlaz — page transitions, content reveals
  appleStandard: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
  // Spori start, brz kraj — staggered reveal sekvence (AnalysisReport, ProcessingScreen)
  appleSmooth: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
} as const;

// ----------------------------------------------------------------------------
// TAP_SCALE — whileTap preset-i (single source of truth)
// Hierarchy: 0.97 / 0.95 / 0.9 / 0.85
// ----------------------------------------------------------------------------

export const TAP_SCALE = {
  /** 0.97 — primary CTA, GradientButton (suptilno, premium iOS feel) */
  primary: 0.97,
  /** 0.95 — sekundarni dugmiići, list items, kartice */
  secondary: 0.95,
  /** 0.92 — back/header ikonice (PageHeader, BottomNav active) */
  icon: 0.92,
  /** 0.9 — header chat/notification badges (Home.tsx) */
  iconStrong: 0.9,
  /** 0.85 — mikro-akcije (water +/-, set complete, češći klikovi) */
  micro: 0.85,
} as const;

// Apple iOS spring physics presets (za type: "spring")
// Mapiranje na najčešće framer-motion patterne u codebase-u (Iter 2b-1b audit).
export const IOS_SPRING = {
  // Soft — menus, cards (Apple UIKit "smooth")
  soft: { type: "spring" as const, stiffness: 260, damping: 26 },
  // Medium — modal/bottom sheet enter (Apple UIKit sheet presentation)
  medium: { type: "spring" as const, stiffness: 300, damping: 28 },
  // Snappy — buttons, toggle switches (Apple UIKit "snappy")
  snappy: { type: "spring" as const, stiffness: 400, damping: 28 },
  // Precise — layoutId animations (tab indicator, toggle, check bounce)
  precise: { type: "spring" as const, stiffness: 500, damping: 30 },
  // Bouncy — celebrations, modal entrances (Apple UIKit "bouncy")
  bouncy: { type: "spring" as const, stiffness: 350, damping: 18 },
};

// ----------------------------------------------------------------------------
// fadeUp — ulazni efekat za content card-ove (Home, Gym, itd.)
// ----------------------------------------------------------------------------

export interface MotionPreset {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
}

export const fadeUp = (delay = 0): MotionPreset => {
  const reduce = shouldReduceMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: reduce
      ? { duration: 0.01, delay: 0 }
      : { duration: MOTION_DURATION.spring, delay, ease: MOTION_EASE.easeOut },
  };
};

// ----------------------------------------------------------------------------
// scaleIn — pulsing, tap feedback, ili "pojavljivanje" card-a
// ----------------------------------------------------------------------------

export const scaleIn = (delay = 0): MotionPreset => {
  const reduce = shouldReduceMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: reduce
      ? { duration: 0.01, delay: 0 }
      : { duration: MOTION_DURATION.base, delay, ease: MOTION_EASE.easeOut },
  };
};

// ----------------------------------------------------------------------------
// pulsingBorder — kontinuirana animacija (npr. "Today" u WeeklyCalendar)
// Respektuje reduce-motion → statičan border
// ----------------------------------------------------------------------------

export const pulsingBorderAnimation = (): {
  animate?: { scale: number[] };
  transition?: Transition;
} => {
  if (shouldReduceMotion()) return {};
  return {
    animate: { scale: [1, 1.03, 1] },
    transition: {
      duration: 1.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  };
};

// ----------------------------------------------------------------------------
// variants — za stagger liste
// ----------------------------------------------------------------------------

// DESIGN_AUDIT v2 H6 — centralizovane stagger delay konstante
export const STAGGER_DELAY = {
  /** 30ms — dense/weekly calendar liste */
  tight: 0.03,
  /** 80ms — default za onboarding step liste, card grids */
  base: 0.08,
  /** 120ms — hero/CTA reveal */
  spaced: 0.12,
} as const;

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER_DELAY.base },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: MOTION_DURATION.base } },
};

// ----------------------------------------------------------------------------
// pageTransition — uniformna page-level mount animacija
// Pattern: { initial: y: 10, animate: y: 0, ease: appleStandard }
// Koristi se u svakoj page root <motion.div> da App.tsx mode="wait" ima
// konzistentan enter pattern.
// ----------------------------------------------------------------------------

export const pageTransition = (delay = 0): MotionPreset => {
  const reduce = shouldReduceMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: reduce
      ? { duration: 0.01, delay: 0 }
      : { duration: MOTION_DURATION.base, delay, ease: MOTION_EASE.appleStandard },
  };
};

// ----------------------------------------------------------------------------
// staggerReveal — reveal sekvenca sa Apple Smooth easing
// Za sekvencijalno otkrivanje (AnalysisReport, ProcessingScreen)
// ----------------------------------------------------------------------------

export const staggerReveal = (index: number, baseDelay = 0.05, gap = STAGGER_DELAY.base): MotionPreset => {
  const reduce = shouldReduceMotion();
  return {
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: reduce
      ? { duration: 0.01, delay: 0 }
      : { duration: MOTION_DURATION.slow, delay: baseDelay + index * gap, ease: MOTION_EASE.appleSmooth },
  };
};
