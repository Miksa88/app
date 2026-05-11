// PageTitle — unified large-title block for content area
//
// Spec (Mihajlo, 2026-04-23 policy):
//   PageHeader namerno ne prikazuje naslov (sticky chrome only). Sve stranice
//   render-uju naslov u content-u kao <h1>. Ovaj komponent je jedini ispravan
//   način — ujednačava spacing (px-5 pt-14 pb-2), tipografiju (text-large-title)
//   i fadeUp animaciju, sprecava drift izmedju Gym/Food/Progress/Profile.
//
// Korišćenje:
//   <PageTitle title={t("gym.title")} />
//   <PageTitle title={t("gym.title")} subtitle={`Mezociklus ${n} · ${x}/${y}`} />
//
// Gde NE koristiti:
//   - Home greeting (custom — pozdrav + ime + chat dugme)
//   - Chat (sub-page sa avatarom)

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { HERO_PADDING } from "@/lib/design-tokens";

interface PageTitleProps {
  title: string;
  subtitle?: ReactNode;
  /** True kad već postoji PageHeader iznad — koristi pt-2 umesto pt-14. */
  compact?: boolean;
  className?: string;
}

export const PageTitle = ({ title, subtitle, compact = false, className = "" }: PageTitleProps) => (
  <div className={`px-5 ${compact ? HERO_PADDING.afterHeader : HERO_PADDING.standalone} pb-2 ${className}`}>
    <motion.h1
      {...fadeUp()}
      className="text-large-title text-foreground tracking-tight"
    >
      {title}
    </motion.h1>
    {subtitle && (
      <motion.p
        {...fadeUp(0.05)}
        className="text-caption-1 text-muted-foreground mt-0.5"
      >
        {subtitle}
      </motion.p>
    )}
  </div>
);
