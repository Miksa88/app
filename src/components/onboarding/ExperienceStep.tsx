import { motion } from "framer-motion";
import { Sprout, Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { MOTION_DURATION, MOTION_EASE, TAP_SCALE } from "@/lib/motion";

interface ExperienceStepProps {
  selected: string;
  onSelect: (level: string) => void;
}

interface LevelCard {
  id: string;
  label: string;
  desc: string;
  highlights: string[];
  icon: ComponentType<LucideProps>;
}

const ExperienceStep = ({ selected, onSelect }: ExperienceStepProps) => {
  const { t } = useLanguage();

  const levels: LevelCard[] = [
    {
      id: "beginner",
      label: t("onboarding.expBeginner"),
      desc: t("onboarding.expBeginnerDesc"),
      highlights: ["Full Body", "3–4 dana"],
      icon: Sprout,
    },
    {
      id: "intermediate",
      label: t("onboarding.expIntermediate"),
      desc: t("onboarding.expIntermediateDesc"),
      highlights: ["Upper / Lower", "4–5 dana"],
      icon: Flame,
    },
  ];

  return (
    <div className="space-y-3 pt-2">
      {levels.map((level, i) => {
        const isSelected = selected === level.id;
        const Icon = level.icon;
        return (
          <motion.button
            key={level.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: MOTION_DURATION.base, ease: MOTION_EASE.outQuart }}
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => onSelect(level.id)}
            aria-pressed={isSelected}
            className={`w-full rounded-[20px] p-5 text-left transition-all duration-fast min-h-[100px] flex items-start gap-4 ${
              isSelected
                ? "gradient-primary text-primary-foreground shadow-fab border-2 border-transparent"
                : "bg-card card-shadow border-2 border-transparent hover:border-primary/20"
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              isSelected ? "bg-white/20" : "bg-primary/8"
            }`}>
              <Icon
                size={28}
                strokeWidth={1.8}
                className={isSelected ? "text-primary-foreground" : "text-primary"}
                aria-hidden="true"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-headline ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                {level.label}
              </p>
              <p className={`text-subhead mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {level.desc}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {level.highlights.map((tag) => (
                  <span
                    key={tag}
                    className={`text-caption-2 font-medium px-2 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default ExperienceStep;
