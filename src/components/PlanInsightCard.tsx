import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PlanInsight } from "@/utils/mealPlanGenerator";
import { IOS_SPRING, MOTION_DURATION, MOTION_EASE } from "@/lib/motion";

interface PlanInsightCardProps {
  insights: PlanInsight[];
  metabolicAdjustments: string[];
}

const BORDER_COLORS: Record<string, string> = {
  info: "border-l-[hsl(var(--info))]",
  warning: "border-l-[hsl(var(--warning))]",
  adjustment: "border-l-[hsl(var(--primary))]",
};

const PlanInsightCard = ({ insights, metabolicAdjustments }: PlanInsightCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();

  if (insights.length === 0) return null;

  const adjustmentCount = metabolicAdjustments.length;

  return (
    <div className="bg-card rounded-xl card-shadow overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-4 min-h-12"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">🧬</span>
          <div className="text-left">
            <p className="text-footnote font-semibold text-foreground">{t("insight.howBuilt")}</p>
            <p className="text-caption-2 text-muted-foreground">
              {adjustmentCount > 0
                ? `${adjustmentCount} ${t("insight.adjustmentsApplied")}`
                : t("insight.noAdjustments")}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={IOS_SPRING.snappy}>
          <ChevronDown size={16} className="text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.easeOut }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <div className="separator-ios mb-2" />
              {insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: MOTION_DURATION.fast }}
                  className={`bg-muted/40 rounded-lg p-3 border-l-[3px] ${BORDER_COLORS[insight.type] || "border-l-[hsl(var(--primary))]"}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5 shrink-0" aria-hidden="true">{insight.icon}</span>
                    <div>
                      <p className="text-caption-1 font-semibold text-foreground">{t(insight.title)}</p>
                      <p className="text-caption-2 text-muted-foreground mt-0.5 leading-relaxed">
                        {insight.description.includes('kcal') ? insight.description : t(insight.description)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlanInsightCard;
