import { useEffect, useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, MOTION_EASE, IOS_SPRING } from "@/lib/motion";

interface ProcessingScreenProps {
  onComplete: () => void;
  firstName?: string;
}

const ProcessingScreen = ({ onComplete, firstName }: ProcessingScreenProps) => {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(t("processing.sra1"));
  const [completedItems, setCompletedItems] = useState<number[]>([]);

  const checklistItems = [
    t("processing.check.sra"),
    t("processing.check.metabolism"),
    t("processing.check.calories"),
    t("processing.check.macros"),
    t("processing.check.program"),
  ];

  const statusMessages = [
    t("processing.sra1"),
    t("processing.sra2"),
    t("processing.sra3"),
    t("processing.sra4"),
    t("processing.sra5"),
    t("processing.sra6"),
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 100);

    let msgIdx = 0;
    const statusInterval = setInterval(() => {
      msgIdx++;
      if (msgIdx < statusMessages.length) {
        setStatusText(statusMessages[msgIdx]);
      }
    }, 1800);

    const checkTimers = checklistItems.map((_, i) =>
      setTimeout(() => {
        setCompletedItems((prev) => [...prev, i]);
      }, 2000 + i * 1800)
    );

    const timeout = setTimeout(() => {
      onComplete();
    }, 11000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(statusInterval);
      checkTimers.forEach(clearTimeout);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 pt-28">
      {/* Big percentage */}
      <motion.p
        className="text-display-2xl text-foreground"
        style={{ fontFeatureSettings: '"tnum"' }}
        key={progress}
      >
        {progress}%
      </motion.p>

      {/* Subtitle */}
      <p className="text-title-3 font-semibold text-foreground text-center mt-3 tracking-tight leading-snug">
        {t("processing.headline")}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-sm mt-6">
        <div className="w-full h-[6px] bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))",
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: MOTION_DURATION.fast, ease: MOTION_EASE.linear }}
          />
        </div>
      </div>

      {/* Status text */}
      <div aria-live="polite" aria-atomic="true" className="mt-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={statusText}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_DURATION.base }}
            className="text-subhead text-muted-foreground"
          >
            {statusText}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Checklist */}
      <div className="w-full max-w-sm mt-10">
        <p className="text-subhead font-semibold text-foreground mb-3">
          {t("processing.buildingPlan")}
        </p>
        <div className="space-y-1">
          {checklistItems.map((item, i) => {
            const isCompleted = completedItems.includes(i);
            return (
              <div key={i} className="flex items-center justify-between py-[6px]">
                <div className="flex items-center gap-3">
                  <span className="text-footnote text-muted-foreground/60">•</span>
                  <span className="text-subhead text-foreground">{item}</span>
                </div>
                <AnimatePresence>
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={IOS_SPRING.precise}
                    >
                      <div
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center gradient-primary"
                      >
                        <Check size={ICON_SIZE.xs} className="text-primary-foreground" strokeWidth={3} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProcessingScreen;
