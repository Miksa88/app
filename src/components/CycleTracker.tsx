import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, MOTION_DURATION, MOTION_EASE } from "@/lib/motion";
import { Moon, Sun, Zap, Heart, ChevronDown, ChevronUp, Dumbbell, UtensilsCrossed } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PhaseData {
  nameKey: string;
  icon: typeof Moon;
  color: string;
  bgColor: string;
  borderColor: string;
  days: [number, number];
  trainingTipKey: string;
  nutritionTipKey: string;
  symptomKeys: string[];
}

const PHASES: PhaseData[] = [
  {
    nameKey: "cycle.menstruation",
    icon: Moon,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/20",
    days: [1, 5],
    trainingTipKey: "cycle.menstruation.training",
    nutritionTipKey: "cycle.menstruation.nutrition",
    symptomKeys: ["cycle.symptom.cramps", "cycle.symptom.fatigue", "cycle.symptom.bloating", "cycle.symptom.headache"],
  },
  {
    nameKey: "cycle.follicular",
    icon: Sun,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
    days: [6, 13],
    trainingTipKey: "cycle.follicular.training",
    nutritionTipKey: "cycle.follicular.nutrition",
    symptomKeys: ["cycle.symptom.highEnergy", "cycle.symptom.goodMood", "cycle.symptom.focus"],
  },
  {
    nameKey: "cycle.ovulation",
    icon: Zap,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/20",
    days: [14, 16],
    trainingTipKey: "cycle.ovulation.training",
    nutritionTipKey: "cycle.ovulation.nutrition",
    symptomKeys: ["cycle.symptom.maxEnergy", "cycle.symptom.confidence", "cycle.symptom.mildPain"],
  },
  {
    nameKey: "cycle.luteal",
    icon: Heart,
    color: "text-info",
    bgColor: "bg-info/10",
    borderColor: "border-info/20",
    days: [17, 28],
    trainingTipKey: "cycle.luteal.training",
    nutritionTipKey: "cycle.luteal.nutrition",
    symptomKeys: ["cycle.symptom.pms", "cycle.symptom.cravings", "cycle.symptom.moodSwings", "cycle.symptom.waterRetention"],
  },
];

interface CycleTrackerProps {
  delay?: number;
}

const CycleTracker = ({ delay = 0 }: CycleTrackerProps) => {
  const [expanded, setExpanded] = useState(false);
  const [loggedSymptoms, setLoggedSymptoms] = useState<string[]>([]);
  const { t } = useLanguage();

  const cycleDay = 10;
  const cycleLength = 28;

  const currentPhase = PHASES.find(
    (p) => cycleDay >= p.days[0] && cycleDay <= p.days[1]
  ) || PHASES[0];

  const PhaseIcon = currentPhase.icon;
  const progress = (cycleDay / cycleLength) * 100;

  const toggleSymptom = (symptomKey: string) => {
    setLoggedSymptoms((prev) =>
      prev.includes(symptomKey)
        ? prev.filter((s) => s !== symptomKey)
        : [...prev, symptomKey]
    );
  };

  return (
    <motion.div {...fadeUp(delay)}>
      <div className={`bg-card rounded-xl card-shadow overflow-hidden border ${currentPhase.borderColor}`}>
        {/* Main compact card */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center gap-3 text-left min-h-11"
        >
          <div className={`w-11 h-11 rounded-full ${currentPhase.bgColor} flex items-center justify-center shrink-0`}>
            <PhaseIcon size={20} className={currentPhase.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-body font-semibold text-foreground">{t(currentPhase.nameKey)}</p>
              <span className={`text-caption-2 font-medium px-2 py-0.5 rounded-full ${currentPhase.bgColor} ${currentPhase.color}`}>
                {t("cycle.day")} {cycleDay}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: MOTION_DURATION.xSlow, delay: delay + 0.2, ease: MOTION_EASE.easeOut }}
                className="h-full rounded-full gradient-primary"
              />
            </div>
            <p className="text-caption-1 text-muted-foreground mt-1">
              {t("cycle.dayOf").replace("{current}", String(cycleDay)).replace("{total}", String(cycleLength))}
            </p>
          </div>
          <div className="shrink-0 text-muted-foreground/40">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.easeOut }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                {/* Training tip */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Dumbbell size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-caption-1 font-semibold text-foreground">{t("cycle.trainingTip")}</p>
                    <p className="text-caption-1 text-muted-foreground">{t(currentPhase.trainingTipKey)}</p>
                  </div>
                </div>

                {/* Nutrition tip */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0 mt-0.5">
                    <UtensilsCrossed size={16} className="text-success" />
                  </div>
                  <div>
                    <p className="text-caption-1 font-semibold text-foreground">{t("cycle.nutritionTip")}</p>
                    <p className="text-caption-1 text-muted-foreground">{t(currentPhase.nutritionTipKey)}</p>
                  </div>
                </div>

                {/* Symptom logging */}
                <div>
                  <p className="text-caption-1 font-semibold text-foreground mb-2">{t("cycle.howFeeling")}</p>
                  <div className="flex flex-wrap gap-2">
                    {currentPhase.symptomKeys.map((symptomKey) => (
                      <motion.button
                        key={symptomKey}
                        whileTap={{ scale: 0.93 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSymptom(symptomKey);
                        }}
                        className={`px-3 py-2 rounded-full text-caption-1 font-medium transition-colors min-h-[32px] ${
                          loggedSymptoms.includes(symptomKey)
                            ? `${currentPhase.bgColor} ${currentPhase.color} border ${currentPhase.borderColor}`
                            : "bg-muted text-muted-foreground border border-transparent"
                        }`}
                      >
                        {t(symptomKey)}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CycleTracker;