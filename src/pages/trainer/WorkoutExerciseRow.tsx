// ============================================================================
// ExerciseRow — draggable pojedinačna vežba (Reorder.Item sa drag handle-om)
// Izvučeno iz WorkoutEditor.tsx (page-local subkomponenta, sibling file).
// ============================================================================

import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Trash2 } from "lucide-react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { WorkoutExerciseItem } from "@/data/trainingMockData";

interface ExerciseRowProps {
  ex: WorkoutExerciseItem;
  exIdx: number;
  sectionId: string;
  onRemove: (sectionId: string, exerciseId: string) => void;
  onUpdate: (sectionId: string, exerciseId: string, field: keyof WorkoutExerciseItem, value: WorkoutExerciseItem[keyof WorkoutExerciseItem]) => void;
  t: (key: string) => string;
}

export const ExerciseRow = ({ ex, exIdx, sectionId, onRemove, onUpdate, t }: ExerciseRowProps) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={ex}
      dragListener={false}
      dragControls={dragControls}
      className="relative bg-card rounded-2xl card-shadow overflow-hidden touch-manipulation"
      whileDrag={{
        scale: 1.03,
        boxShadow: "0 16px 40px -8px rgba(0,0,0,0.22)",
        // z-modal (100) — kartica koja se drži uvek je iznad sibling-a
        zIndex: 100,
      }}
      style={{ position: "relative" }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      {/* Row 1: drag handle + index + name + delete */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          className="min-w-8 min-h-8 flex items-center justify-center text-muted-foreground/40 active:text-muted-foreground active:bg-muted/40 rounded-md touch-none cursor-grab active:cursor-grabbing"
          aria-label={t("training.dragReorder")}
        >
          <GripVertical size={16} aria-hidden />
        </button>
        <span className="text-caption-1 font-semibold text-muted-foreground tabular-nums w-5 shrink-0">
          {exIdx + 1}
        </span>
        <p className="text-body font-medium text-foreground flex-1 truncate">{ex.name}</p>
        <button
          type="button"
          onClick={() => onRemove(sectionId, ex.id)}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-full active:bg-destructive/10"
          aria-label={t("common.delete")}
        >
          <Trash2 size={ICON_SIZE.xs} className="text-destructive/70" />
        </button>
      </div>

      {/* Row 2: Sets / Reps / Weight / Rest — iOS pill grid */}
      <div className="grid grid-cols-4 gap-1.5 px-3 pb-3 pt-1">
        {[
          { label: t("training.sets"), value: ex.sets, type: "number", field: "sets" as const, placeholder: "0" },
          { label: t("training.reps"), value: ex.reps, type: "text", field: "reps" as const, placeholder: "8–12" },
          { label: t("training.weight"), value: ex.weight, type: "text", field: "weight" as const, placeholder: "kg" },
          { label: t("training.rest"), value: ex.rest, type: "text", field: "rest" as const, placeholder: "60s" },
        ].map(({ label, value, type, field, placeholder }) => (
          <div key={field} className="flex flex-col items-center gap-1">
            <span className="text-caption-2 text-muted-foreground/80 font-medium">{label}</span>
            <input
              type={type}
              value={value}
              placeholder={placeholder}
              onChange={(e) =>
                onUpdate(
                  sectionId,
                  ex.id,
                  field,
                  type === "number" ? parseInt(e.target.value) || 0 : e.target.value
                )
              }
              className="w-full bg-muted/50 rounded-lg text-footnote font-semibold text-foreground text-center tabular-nums py-2 px-1 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 placeholder:font-normal"
            />
          </div>
        ))}
      </div>
    </Reorder.Item>
  );
};
