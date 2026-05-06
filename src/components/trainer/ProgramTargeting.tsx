import { useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, MOTION_EASE, TAP_SCALE, IOS_SPRING } from "@/lib/motion";

export interface ProgramSelections {
  experience: string | null;
  goal: string | null;
  frequency: number | null;
  limitations: string[];
  isFreeTrial: boolean;
}

export const buildTagsFromSelections = (s: ProgramSelections): string[] => {
  const tags: string[] = [];
  if (s.experience) tags.push(s.experience);
  if (s.goal) tags.push(s.goal);
  if (s.frequency) tags.push(`${s.frequency}_days_week`);
  s.limitations.forEach(l => tags.push(`safe_${l}`));
  if (s.isFreeTrial) tags.push("free_trial");
  return tags;
};

export const parseTagsToSelections = (tags: string[]): ProgramSelections => ({
  experience: ["beginner", "intermediate", "advanced"].find(t => tags.includes(t)) || null,
  goal: ["fat_loss", "figure", "health", "muscle_gain"].find(t => tags.includes(t)) || null,
  frequency: tags.includes("3_days_week") ? 3 : tags.includes("4_days_week") ? 4 : tags.includes("5_days_week") ? 5 : null,
  limitations: tags.filter(t => t.startsWith("safe_")).map(t => t.replace("safe_", "")),
  isFreeTrial: tags.includes("free_trial"),
});

interface Props {
  selections: ProgramSelections;
  onChange: (s: ProgramSelections) => void;
  hideLimitations?: boolean;
}

const ProgramTargeting = ({ selections, onChange, hideLimitations = false }: Props) => {
  const { t } = useLanguage();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggle = (id: string) => setOpenSection(prev => (prev === id ? null : id));
  const update = (patch: Partial<ProgramSelections>) => onChange({ ...selections, ...patch });

  const experienceOptions = [
    { id: "beginner", label: t("program.beginner"), desc: t("program.beginnerDesc") },
    { id: "intermediate", label: t("program.intermediate"), desc: t("program.intermediateDesc") },
    { id: "advanced", label: t("program.advanced"), desc: t("program.advancedDesc") },
  ];

  const goalOptions = [
    { id: "fat_loss", label: t("program.fatLoss"), desc: t("program.fatLossDesc") },
    { id: "figure", label: t("program.figure"), desc: t("program.figureDesc") },
    { id: "health", label: t("program.health"), desc: t("program.healthDesc") },
    { id: "muscle_gain", label: t("program.muscleGain"), desc: t("program.muscleGainDesc") },
  ];

  const limitationAreas = [
    { id: "none", emoji: "💪", label: t("onboarding.painNone") },
    { id: "lower_back", emoji: "🔙", label: t("onboarding.painLowerBack") },
    { id: "knees", emoji: "🦵", label: t("onboarding.painKnees") },
    { id: "shoulders", emoji: "🤷", label: t("onboarding.painShoulders") },
    { id: "neck", emoji: "🧣", label: t("onboarding.painNeck") },
    { id: "wrists", emoji: "✋", label: t("onboarding.painWrists") },
    { id: "hips", emoji: "🦴", label: t("onboarding.painHips") },
    { id: "ankles", emoji: "🦶", label: t("onboarding.painAnkles") },
  ];

  const freqOptions = [3, 4, 5];

  const experienceLabel = experienceOptions.find(o => o.id === selections.experience)?.label || t("program.noneSelected");
  const goalLabel = goalOptions.find(o => o.id === selections.goal)?.label || t("program.noneSelected");
  const freqLabel = selections.frequency ? `${selections.frequency} ${t("program.daysPerWeek")}` : t("program.noneSelected");
  const limLabel = selections.limitations.length > 0 ? `${selections.limitations.length} ${t("program.selected")}` : t("program.noneSelected");

  const toggleLimitation = (id: string) => {
    if (id === "none") {
      update({ limitations: [] });
    } else {
      const current = selections.limitations;
      const next = current.includes(id) ? current.filter(l => l !== id) : [...current, id];
      update({ limitations: next });
    }
  };

  // Summary
  const summaryParts: string[] = [];
  if (selections.experience) summaryParts.push(experienceOptions.find(o => o.id === selections.experience)?.label || "");
  if (selections.goal) summaryParts.push(goalOptions.find(o => o.id === selections.goal)?.label || "");
  if (selections.frequency) summaryParts.push(`${selections.frequency} ${t("program.daysPerWeek")}`);
  if (selections.limitations.length > 0) {
    const names = selections.limitations.map(l => limitationAreas.find(a => a.id === l)?.label || l).join(", ");
    summaryParts.push(`${t("program.avoidExercises")}: ${names}`);
  }

  return (
    <div className="space-y-3">
      {/* Section 1: Experience */}
      <AccordionCard
        title={t("program.experienceLevel")}
        summary={experienceLabel}
        isOpen={openSection === "experience"}
        onToggle={() => toggle("experience")}
      >
        <div className="space-y-2">
          {experienceOptions.map(opt => (
            <SelectableCard
              key={opt.id}
              label={opt.label}
              desc={opt.desc}
              selected={selections.experience === opt.id}
              onSelect={() => update({ experience: selections.experience === opt.id ? null : opt.id })}
            />
          ))}
        </div>
      </AccordionCard>

      {/* Section 2: Goal */}
      <AccordionCard
        title={t("program.primaryGoal")}
        summary={goalLabel}
        isOpen={openSection === "goal"}
        onToggle={() => toggle("goal")}
      >
        <div className="space-y-2">
          {goalOptions.map(opt => (
            <SelectableCard
              key={opt.id}
              label={opt.label}
              desc={opt.desc}
              selected={selections.goal === opt.id}
              onSelect={() => update({ goal: selections.goal === opt.id ? null : opt.id })}
            />
          ))}
        </div>
      </AccordionCard>

      {/* Section 3: Frequency */}
      <AccordionCard
        title={t("program.trainingFrequency")}
        summary={freqLabel}
        isOpen={openSection === "frequency"}
        onToggle={() => toggle("frequency")}
      >
        <div className="pt-2">
          <div className="flex items-center justify-center gap-4 mb-3">
            {freqOptions.map(num => {
              const isSelected = selections.frequency === num;
              return (
                <motion.button
                  key={num}
                  whileTap={{ scale: TAP_SCALE.iconStrong }}
                  onClick={() => update({ frequency: isSelected ? null : num })}
                  className={`w-[64px] h-[64px] rounded-full flex items-center justify-center text-title-3 font-bold transition-colors min-h-11 ${
                    isSelected
                      ? "gradient-primary text-primary-foreground shadow-fab"
                      : "bg-background-secondary card-shadow text-foreground"
                  }`}
                >
                  {num}
                </motion.button>
              );
            })}
          </div>
          <p className="text-center text-caption-1 text-muted-foreground">{t("program.daysPerWeek")}</p>
        </div>
      </AccordionCard>

      {/* Section 4: Limitations */}
      {!hideLimitations && (
        <AccordionCard
          title={t("program.avoidExercises")}
          summary={limLabel}
          isOpen={openSection === "limitations"}
          onToggle={() => toggle("limitations")}
        >
          <div className="space-y-2">
            {limitationAreas.map(area => {
              const isNone = area.id === "none";
              const isSelected = isNone ? selections.limitations.length === 0 : selections.limitations.includes(area.id);
              return (
                <motion.button
                  key={area.id}
                  whileTap={{ scale: TAP_SCALE.primary }}
                  onClick={() => toggleLimitation(area.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left flex items-center gap-3 min-h-11 transition-all ${
                    isSelected
                      ? "bg-card border-2 border-primary"
                      : "bg-background-secondary border-2 border-transparent"
                  }`}
                >
                  <span className="text-title-3" aria-hidden="true">{area.emoji}</span>
                  <span className={`text-body font-medium flex-1 ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {area.label}
                  </span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center"
                    >
                      <Check size={ICON_SIZE.xs} className="text-primary-foreground" strokeWidth={3} />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </AccordionCard>
      )}

      {/* Section 5: Free Trial toggle */}
      <div className="bg-card rounded-xl card-shadow p-4 flex items-center gap-3">
        <Star size={ICON_SIZE.md} className="text-warning shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-body font-medium text-foreground">{t("program.freeTrialProgram")}</p>
          <p className="text-caption-1 text-muted-foreground mt-0.5">{t("program.freeTrialDesc")}</p>
        </div>
        <button
          onClick={() => update({ isFreeTrial: !selections.isFreeTrial })}
          className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors shrink-0 ${
            selections.isFreeTrial ? "bg-primary" : "bg-muted"
          }`}
        >
          <motion.div
            animate={{ x: selections.isFreeTrial ? 20 : 0 }}
            transition={IOS_SPRING.precise}
            className="w-[27px] h-[27px] rounded-full bg-white shadow-sm"
          />
        </button>
      </div>

      {/* Summary */}
      {summaryParts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/50 rounded-xl p-3"
        >
          <p className="text-caption-1 text-muted-foreground">{summaryParts.join(" · ")}</p>
        </motion.div>
      )}

      {/* Auto-suggest info */}
      <p className="text-caption-2 text-muted-foreground">{t("program.autoSuggestInfo")}</p>
    </div>
  );
};

// ── Accordion Card ──
const AccordionCard = ({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <div className="bg-card rounded-xl card-shadow overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-4 min-h-11"
    >
      <span className="text-body font-semibold text-foreground">{title}</span>
      <div className="flex items-center gap-2">
        <span className="text-caption-1 text-muted-foreground">{summary}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: MOTION_DURATION.fast }}>
          <ChevronDown size={16} className="text-muted-foreground" />
        </motion.div>
      </div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.easeOut }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ── Selectable Card ──
const SelectableCard = ({
  label,
  desc,
  selected,
  onSelect,
}: {
  label: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
}) => (
  <motion.button
    whileTap={{ scale: TAP_SCALE.primary }}
    onClick={onSelect}
    className={`w-full rounded-xl p-3.5 text-left flex items-center gap-3 transition-all min-h-11 ${
      selected
        ? "bg-card border-2 border-primary shadow-sm"
        : "bg-background-secondary border-2 border-transparent"
    }`}
  >
    <div className="flex-1 min-w-0">
      <p className={`text-body font-medium ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
      <p className="text-caption-1 text-muted-foreground mt-0.5">{desc}</p>
    </div>
    {selected && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0"
      >
        <Check size={ICON_SIZE.xs} className="text-primary-foreground" strokeWidth={3} />
      </motion.div>
    )}
  </motion.button>
);

export default ProgramTargeting;
