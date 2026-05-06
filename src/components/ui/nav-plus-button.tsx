// NavPlusButton — unified CTA add button za nav bar pozicije
// Spec: Apple HIG Floating action / iOS 26 gradient circle
//
// Karakteristike:
//   - 44×44pt circular (iOS HIG touch target)
//   - gradient-primary (magenta→purple brand) + shadow-fab
//   - **Nema ring-a** (ring je ne-iOS pattern)
//   - Ikona default je Plus, ali prihvata bilo koju lucide ikonu preko `icon` prop-a
//   - Haptic selection feedback na tap
//   - Scale feedback na press (whileTap 0.92)

import { type ComponentType, type MouseEventHandler } from "react";
import { motion } from "framer-motion";
import { Plus, type LucideProps } from "lucide-react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { IOS_SPRING } from "@/lib/motion";
import { useHaptic } from "@/hooks/useHaptic";

interface NavPlusButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Override ikone (default Plus) */
  icon?: ComponentType<LucideProps>;
  /** A11y label */
  "aria-label"?: string;
  className?: string;
  /** Disable dugme */
  disabled?: boolean;
}

export const NavPlusButton = ({
  onClick,
  icon: Icon = Plus,
  "aria-label": ariaLabel = "Add",
  className = "",
  disabled = false,
}: NavPlusButtonProps) => {
  const haptic = useHaptic();

  return (
    <motion.button
      onClick={(e) => {
        haptic("selection");
        onClick?.(e);
      }}
      whileTap={{ scale: 0.92 }}
      transition={IOS_SPRING.precise}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`w-11 h-11 min-w-11 min-h-11 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-fab active:opacity-90 disabled:opacity-50 disabled:pointer-events-none focus-ring-default ${className}`}
    >
      <Icon size={ICON_SIZE.md} strokeWidth={2.4} aria-hidden="true" />
    </motion.button>
  );
};
