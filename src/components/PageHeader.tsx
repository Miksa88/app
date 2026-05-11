// PageHeader — unified iOS 26 Liquid Glass Navigation Bar
// Spec: Apple HIG + WhatsApp/TikTok iOS 26 pattern — sticky back + optional right action
//
// **GLOBAL POLICY (Mihajlo, 2026-04-23):**
// PageHeader NE prikazuje naslov (ni Large Title ni Inline Title ni Subtitle). Svaka stranica
// koja hoće naslov mora ga render-ovati kao `<h1>` u content-u ispod. Ovo je jedini način
// da se nikad ne desi duplicate title bug (screenshot AssignProgram 2026-04-23). Props
// `title`/`largeTitle`/`subtitle`/`hideInlineTitle` ostaju u API-ju kao no-op radi backward
// compat — biće uklonjeni u sledećem refactor-u.
//
// Korišćenje:
//   <PageHeader onBack={...} />                                  ← sticky back only
//   <PageHeader onBack={...} rightAction={<SaveBtn />} />        ← back + right action
//
// iOS 26 Liquid Glass karakteristike:
//   - Sticky top-0 (nikad ne skroluje sa sadržajem)
//   - Blur/bg fade 0-60px scroll (smooth translucency, no sharp seam)
//   - Liquid Glass back button — circular 36pt, blur + translucent bg + subtle border
//   - Chevron.left u krug (bez teksta, WhatsApp/TikTok stil)
//   - Haptic light + scale feedback na press

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { useScrollEdge } from "@/hooks/useScrollEdge";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";

interface PageHeaderProps {
  /** @deprecated No-op. Render content `<h1>` ispod. */
  title?: string;
  /** @deprecated No-op. Render content `<h1>` ispod. */
  largeTitle?: string;
  /** @deprecated No-op. Render content tekst ispod. */
  subtitle?: string;
  /** Callback za Back dugme (Liquid Glass circular chevron) */
  onBack?: () => void;
  /**
   * @deprecated Zadržano samo za aria-label. iOS 26 Liquid Glass nav ne koristi text label.
   */
  backLabel?: string;
  /**
   * @deprecated Back je uvek icon-only circular u iOS 26 patternu. Prop se ignoriše.
   */
  backIconOnly?: boolean;
  /** Sadržaj gore-desno (Save dugme, icon button, itd.) */
  rightAction?: ReactNode;
  /** @deprecated No-op. PageHeader ne prikazuje naslov uopšte. */
  hideInlineTitle?: boolean;
  /** Dodatne klase za root kontejner */
  className?: string;
}

export const PageHeader = ({
  onBack,
  backLabel,
  rightAction,
  className = "",
}: PageHeaderProps) => {
  const { t } = useLanguage();
  const haptic = useHaptic();
  const { scrollProgress } = useScrollEdge({ threshold: 4, fadeDistance: 60 });

  const handleBack = () => {
    haptic("light");
    onBack?.();
  };

  // Blur/bg intensity: 0 na top, 0.9 max (iOS-native subtle translucency)
  const blurOpacity = scrollProgress * 0.9;

  return (
    <header
      className={`sticky top-0 z-sticky bg-background-secondary ${className}`}
      style={{ backgroundColor: "hsl(var(--background-secondary))" }}
    >
      {/* Blur overlay — scroll-interpolated. Safe-area background uzima istu boju. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-background-secondary backdrop-blur-xl backdrop-saturate-150 pointer-events-none"
        style={{ opacity: blurOpacity }}
      />

      {/* Safe-area top inset (Dynamic Island / notch) */}
      <div style={{ height: "env(safe-area-inset-top, 0px)" }} aria-hidden="true" className="relative" />

      {/* Action bar — Liquid Glass circular buttons only, NO title (title ide u content kao <h1>). */}
      <div className="relative h-11 flex items-center justify-between px-4">
        {/* Left: Back button (Liquid Glass, chevron-only, WhatsApp/TikTok stil) */}
        <div className="flex items-center min-w-0">
          {onBack && (
            <motion.button
              onClick={handleBack}
              whileTap={{ scale: TAP_SCALE.icon }}
              transition={IOS_SPRING.precise}
              aria-label={backLabel ? `${t("common.back")} ${backLabel}` : t("common.back")}
              className="w-9 h-9 min-w-9 min-h-9 rounded-full bg-card/70 backdrop-blur-xl backdrop-saturate-150 border border-border/30 text-foreground active:bg-card flex items-center justify-center shadow-hairline focus-ring-default"
            >
              <ChevronLeft size={20} strokeWidth={2.2} aria-hidden="true" />
            </motion.button>
          )}
        </div>

        {/* Right: Action (Save/Edit/custom button) */}
        <div className="flex items-center justify-end ml-auto">
          {rightAction && (
            <motion.div
              whileTap={{ scale: TAP_SCALE.secondary }}
              transition={IOS_SPRING.precise}
            >
              {rightAction}
            </motion.div>
          )}
        </div>
      </div>

      {/* Breathing room below back button — sprečava da H1/content izgleda zalepljen za nav. */}
      <div className="relative h-2" aria-hidden="true" />
    </header>
  );
};
