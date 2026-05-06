import { motion } from "framer-motion";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { Moon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SleepStepProps {
  rating: number;
  onRate: (rating: number) => void;
}

const SleepStep = ({ rating, onRate }: SleepStepProps) => {
  const { t } = useLanguage();

  const levels = [
    { value: 1, label: t("onboarding.sleepVeryPoor"), hours: t("onboarding.sleepHours1") },
    { value: 2, label: t("onboarding.sleepPoor"), hours: t("onboarding.sleepHours2") },
    { value: 3, label: t("onboarding.sleepAverage"), hours: t("onboarding.sleepHours3") },
    { value: 4, label: t("onboarding.sleepGood"), hours: t("onboarding.sleepHours4") },
    { value: 5, label: t("onboarding.sleepExcellent"), hours: t("onboarding.sleepHours5") },
  ];

  return (
    <div className="flex flex-col items-center pt-8">
      {/* Moon icons */}
      <div className="flex items-center gap-3 mb-6">
        {levels.map((lvl) => (
          <motion.button
            key={lvl.value}
            whileTap={{ scale: TAP_SCALE.micro }}
            onClick={() => onRate(lvl.value)}
            className="min-w-11 min-h-11 flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: lvl.value <= rating ? 1 : 0.8 }}
              transition={IOS_SPRING.snappy}
            >
              <Moon
                size={38}
                className={`transition-colors duration-fast ${
                  lvl.value <= rating ? "text-primary fill-primary" : "text-muted-foreground/25"
                }`}
                fill={lvl.value <= rating ? "currentColor" : "none"}
              />
            </motion.div>
          </motion.button>
        ))}
      </div>

      {/* Label + hours */}
      {rating > 0 && (
        <motion.div
          key={rating}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl card-shadow px-6 py-4 text-center"
        >
          <p className="text-headline text-foreground">
            {levels[rating - 1].label}
          </p>
          <p className="text-subhead text-muted-foreground mt-1">
            {levels[rating - 1].hours}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SleepStep;
