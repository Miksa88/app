// ============================================================================
// ProgressOutlookCard — "kada mogu da očekujem napredak" za korisnika
// ============================================================================
//
// Bez precizne target težine (DB schema je nema), pokazujemo:
//   - Trenutni mode (deficit / recomposition / lean_bulk / maintenance)
//   - Realističan tempo promene/nedeljno
//   - Time-frame za "primetnu promenu" (4-12 nedelja, mode-dependent)
//   - Fudbalska metrika: 5% telesne mase u N nedelja (referentna tačka WHO/NIH)
// ============================================================================

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fadeUp } from "@/lib/motion";
import type { CalorieTargetMode } from "@/types/nutrition";

interface ProgressOutlookCardProps {
  targetMode: CalorieTargetMode | null;
  currentWeightKg: number | null;
  delay?: number;
}

interface OutlookCopy {
  title: string;
  weeklyDelta: string;       // "0.4–0.6 kg/nedeljno"
  noticeableIn: string;      // "4–6 nedelja"
  fiveBumpInWeeks: string;   // "8–12 nedelja"
  icon: typeof TrendingDown;
  iconColor: string;
  iconBg: string;
}

function buildCopy(
  mode: CalorieTargetMode,
  currentWeightKg: number,
  t: (k: string) => string,
): OutlookCopy {
  // Realistični weekly rate-ovi (Spec 02 Sekcija 8 + standardni nutrition guidelines):
  //   deficit: 0.5–0.75% body weight / week (= 0.3–0.5 kg za prosečnu žensku)
  //   recomposition: 0.1–0.3% body weight / week (sporo, ali kvalitetno)
  //   lean_bulk: 0.25–0.5% body weight / week (gain)
  //   maintenance: 0
  const fivePctKg = currentWeightKg * 0.05;

  switch (mode) {
    case "deficit": {
      const lowKg = currentWeightKg * 0.005;
      const highKg = currentWeightKg * 0.0075;
      const weeklyDelta = `−${lowKg.toFixed(1)}–${highKg.toFixed(1)} kg/${t("outlook.week")}`;
      // 5% body weight @ 0.6%/week avg = ~8 weeks; spori = 10–12 weeks
      const fiveBumpWeeks = Math.round((fivePctKg / highKg + fivePctKg / lowKg) / 2);
      const noticeable = "4–6";
      const fiveBump = `${fiveBumpWeeks - 2}–${fiveBumpWeeks + 2}`;
      return {
        title: t("outlook.deficitTitle"),
        weeklyDelta,
        noticeableIn: `${noticeable} ${t("outlook.weeks")}`,
        fiveBumpInWeeks: `${fiveBump} ${t("outlook.weeks")}`,
        icon: TrendingDown,
        iconColor: "text-success",
        iconBg: "bg-success/10",
      };
    }
    case "lean_bulk": {
      const lowKg = currentWeightKg * 0.0025;
      const highKg = currentWeightKg * 0.005;
      const weeklyDelta = `+${lowKg.toFixed(1)}–${highKg.toFixed(1)} kg/${t("outlook.week")}`;
      return {
        title: t("outlook.bulkTitle"),
        weeklyDelta,
        noticeableIn: `6–8 ${t("outlook.weeks")}`,
        fiveBumpInWeeks: `12–16 ${t("outlook.weeks")}`,
        icon: TrendingUp,
        iconColor: "text-secondary",
        iconBg: "bg-secondary/10",
      };
    }
    case "recomposition": {
      return {
        title: t("outlook.recompTitle"),
        weeklyDelta: t("outlook.recompPace"),
        noticeableIn: `8–12 ${t("outlook.weeks")}`,
        fiveBumpInWeeks: `16–24 ${t("outlook.weeks")}`,
        icon: TrendingUp,
        iconColor: "text-primary",
        iconBg: "bg-primary/10",
      };
    }
    case "maintenance":
    default: {
      return {
        title: t("outlook.maintenanceTitle"),
        weeklyDelta: t("outlook.maintenancePace"),
        noticeableIn: t("outlook.maintenanceNoticeable"),
        fiveBumpInWeeks: t("outlook.maintenanceFive"),
        icon: Minus,
        iconColor: "text-muted-foreground",
        iconBg: "bg-muted",
      };
    }
  }
}

const ProgressOutlookCard = ({
  targetMode,
  currentWeightKg,
  delay = 0,
}: ProgressOutlookCardProps) => {
  const { t } = useLanguage();
  if (!targetMode || !currentWeightKg || currentWeightKg <= 0) return null;

  const copy = buildCopy(targetMode, currentWeightKg, t);
  const Icon = copy.icon;

  return (
    <motion.div {...fadeUp(delay)}>
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl ${copy.iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={18} className={copy.iconColor} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-caption-1 text-muted-foreground uppercase tracking-wider font-semibold">
              {t("outlook.label")}
            </p>
            <p className="text-headline text-foreground">{copy.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <p className="text-callout font-bold text-foreground tabular-nums">{copy.weeklyDelta}</p>
            <p className="text-caption-2 text-muted-foreground mt-0.5">{t("outlook.pace")}</p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-callout font-bold text-foreground tabular-nums">{copy.noticeableIn}</p>
            <p className="text-caption-2 text-muted-foreground mt-0.5">{t("outlook.noticeable")}</p>
          </div>
          <div className="text-center">
            <p className="text-callout font-bold text-foreground tabular-nums">{copy.fiveBumpInWeeks}</p>
            <p className="text-caption-2 text-muted-foreground mt-0.5">{t("outlook.fivePct")}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default ProgressOutlookCard;
