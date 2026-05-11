// SavedRepliesSheet — quick "snippets" za trener Chat
// Spec: Quick Win #15 — TrueCoach/Everfit "saved replies" parity.
// MVP: hardcoded lista (5-7 najčešćih). Trener-side custom CRUD u kasnijoj iteraciji.

import { Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (text: string) => void;
}

const SNIPPET_KEYS = [
  "trainerMsg.snippet.greatWork",
  "trainerMsg.snippet.checkForm",
  "trainerMsg.snippet.weightUp",
  "trainerMsg.snippet.restWell",
  "trainerMsg.snippet.logMeals",
  "trainerMsg.snippet.questionAvailable",
  "trainerMsg.snippet.weeklyReminder",
] as const;

export const SavedRepliesSheet = ({ open, onOpenChange, onPick }: Props) => {
  const { t } = useLanguage();
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t("trainerMsg.savedReplies")}>
      <div className="space-y-2 pb-4">
        {SNIPPET_KEYS.map((k) => {
          const text = t(k);
          return (
            <button
              key={k}
              onClick={() => { onPick(text); onOpenChange(false); }}
              className="w-full text-left bg-card rounded-2xl card-shadow p-4 flex items-start gap-3 min-h-11"
            >
              <Sparkles size={16} className="text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <span className="text-body text-foreground">{text}</span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};
