import { motion } from "framer-motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { Leaf, Zap, Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion";

interface StressStepProps {
  level: number;
  onLevelChange: (level: number) => void;
}

const StressStep = ({ level, onLevelChange }: StressStepProps) => {
  const { t } = useLanguage();

  const options = [
    {
      value: 1,
      icon: Leaf,
      title: t("onboarding.tempoBalancedTitle"),
      subtitle: t("onboarding.tempoBalancedSub"),
    },
    {
      value: 2,
      icon: Zap,
      title: t("onboarding.tempoActiveTitle"),
      subtitle: t("onboarding.tempoActiveSub"),
    },
    {
      value: 3,
      icon: Flame,
      title: t("onboarding.tempoHighTitle"),
      subtitle: t("onboarding.tempoHighSub"),
    },
  ];

  return (
    <div className="space-y-3 pt-2">
      {options.map((opt, i) => {
        const isSelected = level === opt.value;
        const Icon = opt.icon;

        return (
          <motion.button
            key={opt.value}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: MOTION_DURATION.base }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onLevelChange(opt.value)}
            className={`w-full text-left rounded-2xl p-5 transition-shadow min-h-11 ${
              isSelected
                ? "bg-card ring-2 ring-primary card-shadow"
                : "bg-card card-shadow"
            }`}
          >
            <div className="flex items-start gap-4">
              <motion.div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isSelected ? "gradient-primary" : "bg-muted"
                }`}
                animate={isSelected ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: MOTION_DURATION.slow, ease: MOTION_EASE.easeOut }}
              >
                <Icon
                  size={ICON_SIZE.lg}
                  className={isSelected ? "text-primary-foreground" : "text-muted-foreground"}
                />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-headline leading-tight text-foreground">
                  {opt.title}
                </p>
                <p className="text-subhead text-muted-foreground mt-1 leading-snug">
                  {opt.subtitle}
                </p>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default StressStep;
