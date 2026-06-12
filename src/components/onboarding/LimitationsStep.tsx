import { motion } from "framer-motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, TAP_SCALE } from "@/lib/motion";

interface LimitationsStepProps {
  selected: string[];
  onToggle: (item: string) => void;
}

const LimitationsStep = ({ selected, onToggle }: LimitationsStepProps) => {
  const { t } = useLanguage();

  const areas = [
    { id: "none", emoji: "💪", label: t("onboarding.painNone") },
    { id: "lower_back", emoji: "🔙", label: t("onboarding.painLowerBack") },
    { id: "knees", emoji: "🦵", label: t("onboarding.painKnees") },
    { id: "shoulders", emoji: "🤷", label: t("onboarding.painShoulders") },
    { id: "neck", emoji: "🧣", label: t("onboarding.painNeck") },
    { id: "wrists", emoji: "✋", label: t("onboarding.painWrists") },
    { id: "hips", emoji: "🦴", label: t("onboarding.painHips") },
    { id: "ankles", emoji: "🦶", label: t("onboarding.painAnkles") },
  ];

  const handleToggle = (id: string) => {
    if (id === "none") {
      onToggle("none");
    } else {
      onToggle(id);
    }
  };

  return (
    <div className="space-y-2.5 pt-2">
      {areas.map((area, i) => {
        const isNone = area.id === "none";
        const isSelected = isNone
          ? selected.includes("none") || selected.length === 0
          : selected.includes(area.id);

        return (
          <motion.button
            key={area.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: MOTION_DURATION.base }}
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => handleToggle(area.id)}
            aria-pressed={isSelected}
            className={`w-full rounded-2xl px-4 py-4 text-left transition ios-row-h flex items-center gap-3 ${
              isSelected
                ? "bg-card border-2 border-primary shadow-fab"
                : "bg-card card-shadow border-2 border-transparent"
            }`}
          >
            <span className="text-title-2" aria-hidden="true">{area.emoji}</span>
            <span className={`text-subhead font-medium flex-1 ${isSelected ? "text-primary" : "text-foreground"}`}>
              {area.label}
            </span>
            {isSelected && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center"
              >
                <Check size={ICON_SIZE.xs} className="text-primary-foreground" strokeWidth={3} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default LimitationsStep;
