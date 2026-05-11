// ============================================================================
// VacationModeCard — trener "I'm on vacation" sa auto-reply porukom
// V3 §12 — citat: "Trainer 'Vacation Mode' — auto-reply"
// ============================================================================

import { Loader2, Plane } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useHaptic } from "@/hooks/useHaptic";
import GradientButton from "@/components/GradientButton";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import {
  useNotificationPreferences,
  useSetNotificationPreferences,
} from "@/hooks/useUserPreferences";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getActiveVacation,
} from "@/services/userPreferencesService";

const VacationModeCard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const haptic = useHaptic();
  const userId = user?.id ?? null;
  const { data: prefs = DEFAULT_NOTIFICATION_PREFERENCES, isLoading } =
    useNotificationPreferences(userId);
  const setMutation = useSetNotificationPreferences(userId);
  const undo = useUndoableAction();

  const active = getActiveVacation(prefs);
  const [until, setUntil] = useState<string>(active?.until ?? "");
  const [message, setMessage] = useState<string>(active?.message ?? "");

  useEffect(() => {
    setUntil(active?.until ?? "");
    setMessage(active?.message ?? "");
  }, [active?.until, active?.message]);

  const mutateAsync = (next: typeof prefs): Promise<void> =>
    new Promise((resolve, reject) =>
      setMutation.mutate(next, {
        onSuccess: () => resolve(),
        onError: (e) => reject(e),
      }),
    );

  const onActivate = () => {
    if (setMutation.isPending) return;
    haptic("medium");
    const previousVacation = prefs.vacation;
    void undo.run({
      title: t("trainer.vacation.statusOn"),
      description: until
        ? t("trainer.vacation.until").replace("{date}", until)
        : undefined,
      apply: () =>
        mutateAsync({
          ...prefs,
          vacation: {
            active: true,
            until: until || null,
            message: message.trim() || null,
          },
        }),
      revert: () =>
        mutateAsync({
          ...prefs,
          vacation: previousVacation ?? { active: false, until: null, message: null },
        }),
    });
  };

  const onDeactivate = () => {
    if (setMutation.isPending) return;
    haptic("medium");
    const previousVacation = prefs.vacation;
    void undo.run({
      title: t("trainer.vacation.actionOff"),
      apply: () =>
        mutateAsync({
          ...prefs,
          vacation: { active: false, until: null, message: null },
        }),
      revert: () =>
        mutateAsync({
          ...prefs,
          vacation: previousVacation ?? null,
        }),
    });
  };

  return (
    <section className="space-y-3" aria-labelledby="vacation-card-title">
      <div className="flex items-center gap-2">
        <Plane size={16} className="text-muted-foreground" aria-hidden="true" />
        <h3 id="vacation-card-title" className="text-headline font-semibold text-foreground">
          {t("trainer.vacation.title")}
        </h3>
      </div>
      <p className="text-footnote text-muted-foreground">
        {t("trainer.vacation.hint")}
      </p>

      {isLoading ? (
        <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />
      ) : active ? (
        <div className="space-y-3">
          <div className="px-4 py-3 rounded-xl bg-info/10 border border-info/30">
            <p className="text-subhead font-semibold text-info">
              {t("trainer.vacation.statusOn")}
            </p>
            {active.until && (
              <p className="text-caption-1 text-muted-foreground">
                {t("trainer.vacation.until").replace("{date}", active.until)}
              </p>
            )}
            {active.message && (
              <p className="text-caption-1 text-muted-foreground italic mt-1">
                "{active.message}"
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onDeactivate}
            disabled={setMutation.isPending}
            className="w-full py-3 rounded-xl bg-card border border-border text-foreground text-body font-semibold flex items-center justify-center gap-2 min-h-12 disabled:opacity-40"
          >
            {setMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : null}
            {t("trainer.vacation.actionOff")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-caption-2 text-muted-foreground mb-1.5 block">
              {t("trainer.vacation.untilLabel")}
            </label>
            <input
              type="date"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-body min-h-12 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-caption-2 text-muted-foreground mb-1.5 block">
              {t("trainer.vacation.messageLabel")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={240}
              className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-body resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("trainer.vacation.messagePlaceholder")}
            />
          </div>
          <GradientButton
            onClick={onActivate}
            disabled={setMutation.isPending}
            loading={setMutation.isPending}
            size="lg"
            className="w-full"
          >
            <Plane size={16} aria-hidden="true" />
            {t("trainer.vacation.actionOn")}
          </GradientButton>
        </div>
      )}
    </section>
  );
};

export default VacationModeCard;
