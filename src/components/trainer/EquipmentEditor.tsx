// ============================================================================
// EquipmentEditor — trener-side toggle grid za klijent equipment
// V3 §10 — "Equipment tab per client"
// ============================================================================

import { Check, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import GradientButton from "@/components/GradientButton";
import {
  EQUIPMENT_OPTIONS,
  type EquipmentOption,
} from "@/services/clientEquipmentService";
import {
  useClientEquipment,
  useSetClientEquipment,
} from "@/hooks/useClientEquipment";

interface Props {
  clientId: string;
}

// Vrednosti EQUIPMENT_OPTIONS su storage format (profiles.equipment_list, Title Case);
// prikaz ide kroz t() ključeve — isti map koristi i ExerciseDetail.
const EQUIPMENT_LABEL_KEY: Record<string, string> = {
  "Barbell": "trainer.equip.barbell",
  "Dumbbell": "trainer.equip.dumbbell",
  "Kettlebell": "trainer.equip.kettlebell",
  "Cable Machine": "trainer.equip.cable_machine",
  "Machine": "trainer.equip.machine",
  "Bench": "trainer.equip.bench",
  "Rack": "trainer.equip.rack",
  "Bodyweight": "trainer.equip.bodyweight",
};

const EquipmentEditor = ({ clientId }: Props) => {
  const { t } = useLanguage();
  const haptic = useHaptic();
  const { data: serverList = [], isLoading } = useClientEquipment(clientId);
  const setMutation = useSetClientEquipment(clientId);
  const undo = useUndoableAction();

  const [draft, setDraft] = useState<string[]>([]);
  useEffect(() => {
    setDraft(serverList);
  }, [serverList]);

  const isDirty =
    draft.length !== serverList.length ||
    draft.some((x) => !serverList.includes(x));

  const toggle = (opt: EquipmentOption) => {
    haptic("light");
    setDraft((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt],
    );
  };

  const mutateAsync = (next: string[]): Promise<void> =>
    new Promise((resolve, reject) =>
      setMutation.mutate(next, {
        onSuccess: () => resolve(),
        onError: (e) => reject(e),
      }),
    );

  const onSave = () => {
    if (!isDirty || setMutation.isPending) return;
    haptic("medium");
    const previous = serverList;
    const next = draft;
    void undo.run({
      title: t("trainer.equipment.title"),
      apply: () => mutateAsync(next),
      revert: () => mutateAsync(previous),
    });
  };

  return (
    <section className="space-y-3" aria-labelledby="equipment-editor-title">
      <div className="flex items-center gap-2">
        <Dumbbell size={16} className="text-muted-foreground" aria-hidden="true" />
        <h3 id="equipment-editor-title" className="text-headline font-semibold text-foreground">
          {t("trainer.equipment.title")}
        </h3>
      </div>
      <p className="text-footnote text-muted-foreground">
        {t("trainer.equipment.hint")}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((opt) => (
            <div key={opt} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map((opt) => {
            const selected = draft.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                aria-pressed={selected}
                className={`flex items-center justify-between px-4 py-3 rounded-xl min-h-12 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  selected
                    ? "bg-primary/10 border-2 border-primary text-foreground"
                    : "bg-card border border-border text-foreground hover:bg-muted/40"
                }`}
              >
                <span className="text-subhead font-medium">{t(EQUIPMENT_LABEL_KEY[opt] ?? opt)}</span>
                {selected && (
                  <Check size={16} className="text-primary shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}

      <GradientButton
        onClick={onSave}
        disabled={!isDirty || setMutation.isPending}
        loading={setMutation.isPending}
        size="lg"
        className="w-full"
      >
        {setMutation.isPending ? t("common.saving") : t("common.save")}
      </GradientButton>
    </section>
  );
};

export default EquipmentEditor;
