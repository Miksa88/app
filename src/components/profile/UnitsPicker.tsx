// ============================================================================
// UnitsPicker — per-user weight (kg/lb) + length (cm/in) toggle
// V3 §6 — citat: "Allowing clients to weigh in stone and lbs"
// ============================================================================

import { Ruler } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useHaptic } from "@/hooks/useHaptic";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import {
  usePreferredUnits,
  useSetPreferredUnits,
} from "@/hooks/useUserPreferences";
import {
  DEFAULT_UNITS,
  type LengthUnit,
  type WeightUnit,
} from "@/services/userPreferencesService";

const UnitsPicker = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const haptic = useHaptic();
  const userId = user?.id ?? null;
  const { data: units = DEFAULT_UNITS } = usePreferredUnits(userId);
  const setMutation = useSetPreferredUnits(userId);
  const undo = useUndoableAction();

  const mutateAsync = (next: typeof units): Promise<void> =>
    new Promise((resolve, reject) =>
      setMutation.mutate(next, {
        onSuccess: () => resolve(),
        onError: (e) => reject(e),
      }),
    );

  const setWeight = (next: WeightUnit) => {
    if (units.weight === next || setMutation.isPending) return;
    haptic("light");
    const previous = units;
    void undo.run({
      title: t("settings.units.title"),
      apply: () => mutateAsync({ ...units, weight: next }),
      revert: () => mutateAsync(previous),
    });
  };
  const setLength = (next: LengthUnit) => {
    if (units.length === next || setMutation.isPending) return;
    haptic("light");
    const previous = units;
    void undo.run({
      title: t("settings.units.title"),
      apply: () => mutateAsync({ ...units, length: next }),
      revert: () => mutateAsync(previous),
    });
  };

  return (
    <section className="space-y-3" aria-labelledby="units-picker-title">
      <div className="flex items-center gap-2">
        <Ruler size={16} className="text-muted-foreground" aria-hidden="true" />
        <h3 id="units-picker-title" className="text-headline font-semibold text-foreground">
          {t("settings.units.title")}
        </h3>
      </div>

      <div className="space-y-3">
        <UnitRow
          label={t("settings.units.weight")}
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lb" },
          ]}
          selected={units.weight}
          onSelect={(v) => setWeight(v as WeightUnit)}
        />
        <UnitRow
          label={t("settings.units.length")}
          options={[
            { value: "cm", label: "cm" },
            { value: "in", label: "in" },
          ]}
          selected={units.length}
          onSelect={(v) => setLength(v as LengthUnit)}
        />
      </div>
    </section>
  );
};

interface UnitRowProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string;
  onSelect: (v: string) => void;
}

const UnitRow = ({ label, options, selected, onSelect }: UnitRowProps) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-subhead text-foreground">{label}</span>
    <div className="inline-flex rounded-xl bg-muted/40 p-0.5">
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            aria-pressed={active}
            className={`px-4 py-2 rounded-lg text-subhead font-medium min-w-[52px] transition-colors ${
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default UnitsPicker;
