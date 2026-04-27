// ============================================================================
// WhyTodayPanel — prevodi aktivne sync rules na ljudski jezik
// ============================================================================
//
// Pokazuje korisniku ZAŠTO se njegov plan menjao danas. Engine je već
// upakovao odluke u UserStatus flag-ove; ova komponenta samo otkriva to.
//
// Aktivne situacije koje se prikazuju:
//   - Deload (volume -50%, kalorije na maintenance)
//   - Return from break (laganije, soft deficit)
//   - Pause event: bolest / putovanje / povreda
//   - Lutealna faza (+150 kcal carbs, intenzitet -5%)
//   - Menstrualna faza (težina nije pouzdana)
//   - Fatigue sync (san < 5h ili stres > 4 → maintenance kalorije)
//   - Metabolic noise blok (>10% tečnih kcal → 3 dana bez progresa)
//   - Hydration first (Rule 5 → 24h block na macro promene)
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles, Moon, Droplets, RefreshCcw, RotateCcw, Thermometer, Plane, AlertTriangle, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { fadeUp, MOTION_DURATION } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import type { UserStatus } from "@/types/userStatus";

interface WhyTodayPanelProps {
  status: UserStatus | null;
  delay?: number;
}

interface ActiveRule {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

function deriveActiveRules(status: UserStatus, t: (k: string) => string): ActiveRule[] {
  const rules: ActiveRule[] = [];

  // Deload (Rule 3)
  if (status.training.isInDeload) {
    rules.push({
      id: "deload",
      icon: RefreshCcw,
      iconColor: "text-info",
      iconBg: "bg-info/10",
      title: t("whyToday.deloadTitle"),
      description: t("whyToday.deloadDesc"),
    });
  }

  // Return from break (Rule 4)
  if (status.training.isInReturnFromBreak) {
    rules.push({
      id: "return",
      icon: RotateCcw,
      iconColor: "text-info",
      iconBg: "bg-info/10",
      title: t("whyToday.returnTitle"),
      description: t("whyToday.returnDesc"),
    });
  }

  // Pause event
  const pause = status.training.activePauseEvent;
  if (pause?.type === "illness") {
    rules.push({
      id: "illness",
      icon: Thermometer,
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
      title: t("whyToday.illnessTitle"),
      description: t("whyToday.illnessDesc"),
    });
  } else if (pause?.type === "travel") {
    rules.push({
      id: "travel",
      icon: Plane,
      iconColor: "text-secondary",
      iconBg: "bg-secondary/10",
      title: t("whyToday.travelTitle"),
      description: t("whyToday.travelDesc"),
    });
  } else if (pause?.type === "injury") {
    rules.push({
      id: "injury",
      icon: AlertTriangle,
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
      title: t("whyToday.injuryTitle"),
      description: t("whyToday.injuryDesc"),
    });
  }

  // Cycle phase
  if (status.bio.cyclePhase === "luteal") {
    rules.push({
      id: "luteal",
      icon: Moon,
      iconColor: "text-secondary",
      iconBg: "bg-secondary/10",
      title: t("whyToday.lutealTitle"),
      description: t("whyToday.lutealDesc"),
    });
  } else if (status.bio.cyclePhase === "menstrual") {
    rules.push({
      id: "menstrual",
      icon: Droplets,
      iconColor: "text-destructive",
      iconBg: "bg-destructive/10",
      title: t("whyToday.menstrualTitle"),
      description: t("whyToday.menstrualDesc"),
    });
  }

  // Fatigue sync (Rule 2)
  if (status.nutrition._fatigueSyncActive) {
    rules.push({
      id: "fatigue",
      icon: Moon,
      iconColor: "text-info",
      iconBg: "bg-info/10",
      title: t("whyToday.fatigueTitle"),
      description: t("whyToday.fatigueDesc"),
    });
  }

  // Metabolic noise (Rule 6)
  if (status.nutrition.isMetabolicNoiseTriggered) {
    rules.push({
      id: "metabolic",
      icon: AlertTriangle,
      iconColor: "text-warning",
      iconBg: "bg-warning/10",
      title: t("whyToday.metabolicTitle"),
      description: t("whyToday.metabolicDesc"),
    });
  }

  // Hydration block (Rule 5)
  if (status._blockMacroChangesUntil && new Date(status._blockMacroChangesUntil) > new Date()) {
    rules.push({
      id: "hydration",
      icon: Droplets,
      iconColor: "text-info",
      iconBg: "bg-info/10",
      title: t("whyToday.hydrationTitle"),
      description: t("whyToday.hydrationDesc"),
    });
  }

  return rules;
}

const WhyTodayPanel = ({ status, delay = 0 }: WhyTodayPanelProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState<boolean>(false);

  if (!status) return null;
  const rules = deriveActiveRules(status, t);
  if (rules.length === 0) return null;  // Nema aktivnih modifikacija — sakri panel

  const FirstIcon = rules[0].icon;

  return (
    <motion.div {...fadeUp(delay)}>
      <Card className="overflow-hidden">
        <button
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          className="w-full px-4 py-3 flex items-center gap-3 min-h-14 text-left"
        >
          <div className={`w-10 h-10 rounded-xl ${rules[0].iconBg} flex items-center justify-center shrink-0`}>
            <FirstIcon size={ICON_SIZE.md} className={rules[0].iconColor} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body font-semibold text-foreground">
              {t("whyToday.title")}
            </p>
            <p className="text-caption-1 text-muted-foreground">
              {rules.length === 1
                ? rules[0].title
                : `${rules.length} ${t("whyToday.activeAdaptations")}`}
            </p>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: MOTION_DURATION.fast }}
            className="shrink-0"
          >
            <ChevronDown size={ICON_SIZE.md} className="text-muted-foreground/60" aria-hidden="true" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: MOTION_DURATION.base }}
              className="overflow-hidden"
            >
              <div className="border-t border-border">
                {rules.map((rule, i) => {
                  const Icon = rule.icon;
                  return (
                    <div
                      key={rule.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        i < rules.length - 1 ? "border-b border-border/50" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${rule.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon size={ICON_SIZE.sm} className={rule.iconColor} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-callout font-semibold text-foreground">{rule.title}</p>
                        <p className="text-footnote text-muted-foreground mt-0.5 leading-relaxed">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div className="px-4 py-3 bg-primary/5 flex items-center gap-2">
                  <Sparkles size={ICON_SIZE.xs} className="text-primary shrink-0" aria-hidden="true" />
                  <p className="text-caption-1 text-muted-foreground">
                    {t("whyToday.footer")}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export default WhyTodayPanel;
