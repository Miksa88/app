// ============================================================================
// MotionButton — Button + framer-motion whileTap/whileHover wrapper
// ============================================================================
//
// Spec: design-system/MASTER.md §3.4 (Haptic press feedback)
// Motion primary CTAs trebaju da koriste ovo umesto raw `<motion.button>` sa
// `gradient-primary` className-om. Garantuje:
//   - Button variant gates (cta, glass, ctaGhost, etc.)
//   - iOS HIG touch target (min-h via size variant)
//   - prefers-reduced-motion respect (framer-motion ga automatski hvata)
//
// Primer:
//   <MotionButton variant="cta" size="xl" onClick={save} whileTap={TAP_SCALE.primary}>
//     {t("save")}
//   </MotionButton>
// ============================================================================

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { TAP_SCALE } from "@/lib/motion";
import { Button, type ButtonProps } from "./button";

// motion(Component) wrapper — forwards ref + adds whileTap/whileHover support.
// React 19 + framer-motion 11 dele compat sa Button (forwardRef-based).
const MotionButtonBase = motion.create(Button);

export type MotionButtonProps = Omit<ButtonProps, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> &
  Omit<HTMLMotionProps<"button">, keyof ButtonProps>;

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ whileTap, ...props }, ref) => (
    <MotionButtonBase
      ref={ref}
      whileTap={whileTap ?? { scale: TAP_SCALE.primary }}
      {...props}
    />
  ),
);
MotionButton.displayName = "MotionButton";
