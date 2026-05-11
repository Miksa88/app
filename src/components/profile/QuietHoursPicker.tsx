// ============================================================================
// QuietHoursPicker — per-user push notification quiet window
// V3 §14 (Quick Win #9 — default 22:00–07:00)
// ============================================================================

import { MoonStar } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useHaptic } from "@/hooks/useHaptic";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import GradientButton from "@/components/GradientButton";
import {
  useNotificationPreferences,
  useSetNotificationPreferences,
} from "@/hooks/useUserPreferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/services/userPreferencesService";

const QuietHoursPicker = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const haptic = useHaptic();
  const userId = user?.id ?? null;
  const { data: prefs = DEFAULT_NOTIFICATION_PREFERENCES, isLoading } =
    useNotificationPreferences(userId);
  const setMutation = useSetNotificationPreferences(userId);
  const undo = useUndoableAction();

  const [start, setStart] = useState(prefs.quiet_hours.start);
  const [end, setEnd] = useState(prefs.quiet_hours.end);

  useEffect(() => {
    setStart(prefs.quiet_hours.start);
    setEnd(prefs.quiet_hours.end);
  }, [prefs.quiet_hours.start, prefs.quiet_hours.end]);

  const isDirty =
    start !== prefs.quiet_hours.start || end !== prefs.quiet_hours.end;

  const mutateAsync = (next: typeof prefs): Promise<void> =>
    new Promise((resolve, reject) =>
      setMutation.mutate(next, {
        onSuccess: () => resolve(),
        onError: (e) => reject(e),
      }),
    );

  const onSave = () => {
    if (!isDirty || setMutation.isPending) return;
    haptic("light");
    const previous = prefs;
    void undo.run({
      title: t("settings.notifQuietHours"),
      apply: () => mutateAsync({ ...prefs, quiet_hours: { start, end } }),
      revert: () => mutateAsync(previous),
    });
  };

  return (
    <section className="space-y-3" aria-labelledby="quiet-hours-title">
      <div className="flex items-center gap-2">
        <MoonStar size={16} className="text-muted-foreground" aria-hidden="true" />
        <h3 id="quiet-hours-title" className="text-headline font-semibold text-foreground">
          {t("settings.notifQuietHours")}
        </h3>
      </div>
      <p className="text-footnote text-muted-foreground">
        {t("settings.notifQuietHoursHint")}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />
          <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-caption-2 text-muted-foreground mb-1.5 block">
              {t("settings.notifQuietStart")}
            </span>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-body min-h-12 focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-caption-2 text-muted-foreground mb-1.5 block">
              {t("settings.notifQuietEnd")}
            </span>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-body min-h-12 focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
            />
          </label>
        </div>
      )}

      {isDirty && (
        <GradientButton
          onClick={onSave}
          disabled={setMutation.isPending}
          loading={setMutation.isPending}
          size="lg"
          className="w-full"
        >
          {setMutation.isPending ? t("common.saving") : t("common.save")}
        </GradientButton>
      )}
    </section>
  );
};

export default QuietHoursPicker;
