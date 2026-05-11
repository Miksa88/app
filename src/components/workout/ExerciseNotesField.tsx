// ExerciseNotesField — collapsible textarea za persistent note po vežbi.
// Auto-save on blur. Default collapsed (samo trigger), proširi se na tap.
//
// Spec: ActiveWorkout user-voice (10.841 votes) "Custom text notes per exercise".

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useExerciseNote } from "@/hooks/useExerciseNote";

interface Props {
  exerciseId: string | null;
}

export const ExerciseNotesField = ({ exerciseId }: Props) => {
  const { t } = useLanguage();
  const { note, setNote, save, isLoading } = useExerciseNote(exerciseId);
  const [expanded, setExpanded] = useState<boolean>(false);

  // Ako postoji prethodna beleška za vežbu, default expanded.
  useEffect(() => {
    if (note.trim().length > 0) setExpanded(true);
  }, [note]);

  if (!exerciseId) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mb-4 w-full inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 text-muted-foreground text-footnote min-h-9"
        aria-label={t("workout.notes")}
      >
        <Pencil size={14} aria-hidden="true" />
        <span>{t("workout.notes")}</span>
      </button>
    );
  }

  return (
    <div className="mb-4">
      <label className="text-caption-1 text-muted-foreground uppercase tracking-wider font-medium mb-1 block">
        {t("workout.notes")}
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => void save()}
        placeholder={t("workout.notesPlaceholder")}
        rows={3}
        disabled={isLoading}
        className="w-full bg-card rounded-xl card-shadow p-3 text-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      />
    </div>
  );
};
