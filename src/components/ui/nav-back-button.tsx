// NavBackButton — unified iOS 26 Liquid Glass back button
// Spec: Apple HIG iOS 15+ + WhatsApp/TikTok iOS 26 pattern
//
// Koristi se u chat screens, modals, ili bilo kom custom header-u koji
// ne koristi PageHeader (koji već ima isti pattern inline).
//
// Karakteristike:
//   - 36×36pt visible size, 44×44pt touch target (min-h-9 min-w-9 + hit area)
//   - Liquid Glass: bg-card/70 + backdrop-blur-xl + border/30 + shadow-hairline
//   - Chevron-only (bez text-a)
//   - Haptic light feedback na tap
//   - Scale 0.92 whileTap

import { type MouseEventHandler } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { IOS_SPRING } from "@/lib/motion";

interface NavBackButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** A11y label (default "Back" preko i18n) */
  "aria-label"?: string;
  className?: string;
}

export const NavBackButton = ({
  onClick,
  "aria-label": ariaLabel,
  className = "",
}: NavBackButtonProps) => {
  const { t } = useLanguage();
  const haptic = useHaptic();

  return (
    <motion.button
      onClick={(e) => {
        haptic("light");
        onClick?.(e);
      }}
      whileTap={{ scale: 0.92 }}
      transition={IOS_SPRING.precise}
      aria-label={ariaLabel ?? t("common.back")}
      className={`w-9 h-9 min-w-9 min-h-9 rounded-full bg-card/70 backdrop-blur-xl backdrop-saturate-150 border border-border/30 text-foreground active:bg-card flex items-center justify-center shadow-hairline focus-ring-default ${className}`}
    >
      <ChevronLeft size={20} strokeWidth={2.2} aria-hidden="true" />
    </motion.button>
  );
};
