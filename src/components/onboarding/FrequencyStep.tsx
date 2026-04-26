import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, MOTION_EASE, TAP_SCALE } from "@/lib/motion";

interface FrequencyStepProps {
  selected: number;
  onSelect: (freq: number) => void;
  /**
   * Spec 01 Sekcija 3 (Conditional branching):
   *   beginner    → 3 ili 4 dana (Full Body)
   *   intermediate → 4 ili 5 dana (Upper/Lower split)
   * (2026-04-20: Advanced uklonjen iz UI-a; Intermediate pokriva oba.)
   */
  experienceLevel?: 'beginner' | 'intermediate';
}

interface FrequencyOption {
  value: number;
  subtitle: string;
  weekDots: Array<'train' | 'rest'>;
}

const WEEKDAYS = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];

// Distribucija (poklapa se sa TRAINING_DAY_SLOTS u sessionResolver.ts)
const DISTRIBUTION_BY_DAYS: Record<number, number[]> = {
  3: [0, 2, 4],       // Pon / Sre / Pet
  4: [0, 1, 3, 4],    // Pon / Uto / Čet / Pet
  5: [0, 1, 2, 4, 5], // Pon / Uto / Sre / Pet / Sub
};

const FrequencyStep = ({ selected, onSelect, experienceLevel }: FrequencyStepProps) => {
  const { t } = useLanguage();
  const options =
    experienceLevel === 'beginner' ? [3, 4]
    : experienceLevel === 'intermediate' ? [4, 5]
    : [3, 4, 5];

  const getSubtitle = (n: number): string => {
    switch (n) {
      case 3: return "Blaži tempo, dovoljno za rezultate";
      case 4: return "Stabilan progres sa punim oporavkom";
      case 5: return "Maksimalni fokus na rezultat";
      default: return "";
    }
  };

  const cards: FrequencyOption[] = options.map((value) => {
    const trainingIndexes = DISTRIBUTION_BY_DAYS[value] ?? [];
    const weekDots: Array<'train' | 'rest'> = Array.from({ length: 7 }).map(
      (_, i) => (trainingIndexes.includes(i) ? 'train' : 'rest'),
    );
    return {
      value,
      subtitle: getSubtitle(value),
      weekDots,
    };
  });

  return (
    <div className="space-y-3 pt-2">
      {cards.map((opt, i) => {
        const isSelected = selected === opt.value;
        return (
          <motion.button
            key={opt.value}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: MOTION_DURATION.base, ease: MOTION_EASE.outQuart }}
            whileTap={{ scale: TAP_SCALE.primary }}
            onClick={() => onSelect(opt.value)}
            aria-pressed={isSelected}
            className={`w-full rounded-[20px] p-5 text-left transition-all duration-fast min-h-[100px] flex items-start gap-4 ${
              isSelected
                ? "gradient-primary text-primary-foreground shadow-fab border-2 border-transparent"
                : "bg-card card-shadow border-2 border-transparent hover:border-primary/20"
            }`}
          >
            {/* Veliki broj — beli na gradient-u kad je selektovan, primary inače */}
            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
              isSelected ? "bg-white/20" : "bg-primary/8"
            }`}>
              <span className={`text-title-2 font-bold leading-none ${
                isSelected ? "text-primary-foreground" : "text-primary"
              }`}>
                {opt.value}
              </span>
              <span className={`text-caption-micro uppercase tracking-wider mt-0.5 ${
                isSelected ? "text-primary-foreground/80" : "text-primary/70"
              }`}>
                dana
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-headline ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
                {opt.value} dana nedeljno
              </p>
              <p className={`text-subhead mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {opt.subtitle}
              </p>

              {/* Week dots — beli kad je selektovano, primary inače */}
              <div className="flex items-center gap-1 mt-3" aria-label={t("a11y.weekSchedule")}>
                {opt.weekDots.map((kind, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        kind === 'train'
                          ? isSelected ? "bg-primary-foreground" : "bg-primary"
                          : isSelected ? "bg-primary-foreground/30" : "bg-muted-foreground/25"
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-caption-micro ${
                        kind === 'train'
                          ? isSelected ? "text-primary-foreground font-semibold" : "text-foreground font-semibold"
                          : isSelected ? "text-primary-foreground/50" : "text-muted-foreground/50"
                      }`}
                    >
                      {WEEKDAYS[idx]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

export default FrequencyStep;
