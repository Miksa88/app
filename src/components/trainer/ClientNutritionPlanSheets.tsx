// Bottom sheet-ovi za ClientNutritionPlan — macro preset, template switcher, add meal.
// Verbatim JSX premešten iz ClientNutritionPlan.tsx, bez izmena logike.
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { TAP_SCALE } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import type { NutritionTemplate } from "@/utils/mealPlanGenerator";
import { BottomSheet } from "@/components/ui/bottom-sheet";

export interface MacroRatio {
  protein: number;
  carbs: number;
  fat: number;
}

export const MACRO_PRESETS = [
  { id: "balanced", label: "Balanced", p: 30, c: 40, f: 30 },
  { id: "highProtein", label: "High Protein", p: 40, c: 30, f: 30 },
  { id: "lowCarb", label: "Low Carb", p: 40, c: 20, f: 40 },
  { id: "keto", label: "Keto", p: 25, c: 5, f: 70 },
  { id: "lowFat", label: "Low Fat", p: 25, c: 55, f: 20 },
];

export const MEAL_SLOT_TYPES = [
  "breakfast",
  "morning_snack",
  "lunch",
  "afternoon_snack",
  "dinner",
  "evening_snack",
  "pre_workout",
  "post_workout",
] as const;

// Macro Preset Sheet
export const MacroPresetSheet = ({
  open,
  onOpenChange,
  macroRatio,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  macroRatio: MacroRatio;
  onSelect: (preset: typeof MACRO_PRESETS[0]) => void;
}) => {
  const { t } = useLanguage();
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("nutrition.macroPreset")}
    >
      <div className="space-y-2 pt-2 pb-2">
        {MACRO_PRESETS.map((preset) => (
          <motion.button
            key={preset.id}
            whileTap={{ scale: TAP_SCALE.secondary }}
            onClick={() => onSelect(preset)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border ios-row-h ${
              macroRatio.protein === preset.p &&
              macroRatio.carbs === preset.c &&
              macroRatio.fat === preset.f
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            {/* Mini bar */}
            <div className="flex w-16 h-3 rounded-full overflow-hidden shrink-0">
              <div style={{ width: `${preset.p}%`, backgroundColor: "hsl(var(--info))" }} />
              <div style={{ width: `${preset.c}%`, backgroundColor: "hsl(var(--warning))" }} />
              <div style={{ width: `${preset.f}%`, backgroundColor: "hsl(var(--destructive))" }} />
            </div>
            <div className="text-left flex-1">
              <p className="text-body font-semibold text-foreground">
                {preset.label}
              </p>
              <p className="text-caption-1 text-muted-foreground">
                P:{preset.p}% C:{preset.c}% F:{preset.f}%
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </BottomSheet>
  );
};

// Template Switcher Sheet
export const TemplateSwitcherSheet = ({
  open,
  onOpenChange,
  templates,
  selectedTemplateId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: NutritionTemplate[];
  selectedTemplateId: string;
  onSelect: (tmpl: NutritionTemplate) => void;
}) => {
  const { t } = useLanguage();
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("nutrition.templates")}
    >
      <div className="space-y-2 pt-2 pb-2">
        {templates.map((tmpl) => (
          <motion.button
            key={tmpl.id}
            whileTap={{ scale: TAP_SCALE.secondary }}
            onClick={() => onSelect(tmpl)}
            className={`w-full text-left p-3 rounded-xl border ios-row-h ${
              selectedTemplateId === tmpl.id
                ? "border-primary bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <p className="text-body font-semibold text-foreground">
              {tmpl.name}
            </p>
            <p className="text-caption-1 text-muted-foreground">
              {tmpl.description}
            </p>
          </motion.button>
        ))}
      </div>
    </BottomSheet>
  );
};

// Add Meal Sheet — izbor slot tipa
export const AddMealSheet = ({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (slotType: string) => void;
}) => {
  const { t } = useLanguage();
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("nutrition.addMeal")}
    >
      <div className="space-y-1 pt-2 pb-2">
        {MEAL_SLOT_TYPES.map((type) => {
          const labelKey = `nutrition.mealSlot${type
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join("")}`;
          return (
            <motion.button
              key={type}
              whileTap={{ scale: TAP_SCALE.secondary }}
              onClick={() => onSelect(type)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card min-h-11"
            >
              <span className="text-body text-foreground">{t(labelKey)}</span>
              <ChevronRight size={16} className="text-muted-foreground/40" />
            </motion.button>
          );
        })}
      </div>
    </BottomSheet>
  );
};
