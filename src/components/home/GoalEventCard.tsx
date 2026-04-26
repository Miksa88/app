// ============================================================================
// GoalEventCard — countdown widget za specifičan događaj
// ============================================================================
//
// Korisnik bira svadba/putovanje/more, datum, opciono target težinu.
// Card pokazuje "Svadba — 45 dana" + progres bar + CTA "Pojačaj plan".
// "Pojačaj plan" je placeholder — buduća iteracija može pojačati deficit
// u zadnjih 4 nedelje pred event.
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGoalEvent, type GoalEvent } from "@/hooks/useGoalEvent";
import { useLanguage } from "@/contexts/LanguageContext";
import { fadeUp, IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { toast } from "sonner";

interface GoalEventCardProps {
  delay?: number;
}

const inputClass =
  "w-full bg-muted/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-12";

const GoalEventCard = ({ delay = 0 }: GoalEventCardProps) => {
  const { t } = useLanguage();
  const { event, daysRemaining, setEvent } = useGoalEvent();
  const [showSheet, setShowSheet] = useState(false);
  const [name, setName] = useState(event?.name ?? "");
  const [date, setDate] = useState(event?.dateISO ?? "");
  const [targetWeight, setTargetWeight] = useState(
    event?.targetWeightKg ? String(event.targetWeightKg) : "",
  );

  const openSheet = () => {
    setName(event?.name ?? "");
    setDate(event?.dateISO ?? "");
    setTargetWeight(event?.targetWeightKg ? String(event.targetWeightKg) : "");
    setShowSheet(true);
  };

  const saveEvent = () => {
    if (!name.trim() || !date) {
      toast.error(t("goalEvent.fillAll"));
      return;
    }
    const next: GoalEvent = {
      name: name.trim(),
      dateISO: date,
      targetWeightKg: targetWeight ? Number(targetWeight) : undefined,
    };
    setEvent(next);
    setShowSheet(false);
    toast.success(t("goalEvent.saved"));
  };

  const removeEvent = () => {
    setEvent(null);
    setShowSheet(false);
  };

  // Empty state — no event set
  if (!event) {
    return (
      <>
        <motion.div {...fadeUp(delay)}>
          <button
            onClick={openSheet}
            className="w-full bg-card rounded-2xl card-shadow p-4 flex items-center gap-4 text-left border border-dashed border-primary/20 hover:border-primary/40 transition-colors"
            aria-label={t("goalEvent.addEvent")}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body font-semibold text-foreground">{t("goalEvent.addEvent")}</p>
              <p className="text-caption-1 text-muted-foreground">{t("goalEvent.addHint")}</p>
            </div>
          </button>
        </motion.div>
        <EventSheet
          open={showSheet}
          onClose={() => setShowSheet(false)}
          name={name}
          setName={setName}
          date={date}
          setDate={setDate}
          targetWeight={targetWeight}
          setTargetWeight={setTargetWeight}
          onSave={saveEvent}
          onRemove={null}
          inputClass={inputClass}
          t={t}
        />
      </>
    );
  }

  const days = daysRemaining ?? 0;
  const tone = days < 0 ? "passed" : days <= 7 ? "imminent" : days <= 30 ? "soon" : "far";

  return (
    <>
      <motion.div {...fadeUp(delay)}>
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-fab">
              <Sparkles size={ICON_SIZE.lg} className="text-primary-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-caption-1 text-muted-foreground uppercase tracking-wider font-semibold">
                {t("goalEvent.label")}
              </p>
              <p className="text-headline text-foreground">{event.name}</p>
            </div>
            <button
              onClick={openSheet}
              aria-label={t("goalEvent.edit")}
              className="text-muted-foreground/70 min-w-11 min-h-11 flex items-center justify-center"
            >
              <Calendar size={ICON_SIZE.sm} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-display-lg font-bold gradient-text tabular-nums">
              {Math.abs(days)}
            </span>
            <span className="text-body text-muted-foreground">
              {days < 0 ? t("goalEvent.daysAgo") : t("goalEvent.daysLeft")}
            </span>
          </div>

          {event.targetWeightKg && days >= 0 && (
            <p className="text-caption-1 text-muted-foreground mt-2">
              {t("goalEvent.targetWeight")}: {event.targetWeightKg} kg
            </p>
          )}

          {tone === "imminent" && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-warning/10 text-warning text-caption-1">
              {t("goalEvent.imminentHint")}
            </div>
          )}
          {tone === "soon" && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-info/10 text-info text-caption-1">
              {t("goalEvent.soonHint")}
            </div>
          )}
        </Card>
      </motion.div>
      <EventSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        name={name}
        setName={setName}
        date={date}
        setDate={setDate}
        targetWeight={targetWeight}
        setTargetWeight={setTargetWeight}
        onSave={saveEvent}
        onRemove={removeEvent}
        inputClass={inputClass}
        t={t}
      />
    </>
  );
};

interface EventSheetProps {
  open: boolean;
  onClose: () => void;
  name: string;
  setName: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  targetWeight: string;
  setTargetWeight: (v: string) => void;
  onSave: () => void;
  onRemove: (() => void) | null;
  inputClass: string;
  t: (k: string) => string;
}

const EventSheet = ({
  open,
  onClose,
  name,
  setName,
  date,
  setDate,
  targetWeight,
  setTargetWeight,
  onSave,
  onRemove,
  inputClass,
  t,
}: EventSheetProps) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-50"
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={IOS_SPRING.medium}
          role="dialog"
          aria-modal="true"
          aria-label={t("goalEvent.title")}
          className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-card rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto"
        >
          <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

          <div className="flex items-start justify-between mb-1">
            <h2 className="text-title-2 font-bold text-foreground">{t("goalEvent.title")}</h2>
            <button onClick={onClose} aria-label={t("mealPlan.cancel")} className="text-muted-foreground min-w-11 min-h-11 flex items-center justify-center">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="text-caption-1 text-muted-foreground mb-4">{t("goalEvent.hint")}</p>

          <div className="space-y-3">
            <div>
              <label className="text-caption-1 font-medium text-muted-foreground mb-1.5 block">
                {t("goalEvent.eventName")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("goalEvent.eventNamePlaceholder")}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-caption-1 font-medium text-muted-foreground mb-1.5 block">
                {t("goalEvent.eventDate")}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-caption-1 font-medium text-muted-foreground mb-1.5 block">
                {t("goalEvent.targetWeightOptional")}
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="60"
                className={inputClass}
              />
            </div>
          </div>

          <motion.div whileTap={{ scale: TAP_SCALE.primary }} className="mt-6">
            <Button onClick={onSave} variant="cta" size="xl">
              {t("goalEvent.save")}
            </Button>
          </motion.div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="w-full py-3 text-destructive text-body mt-2 min-h-11"
            >
              {t("goalEvent.remove")}
            </button>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default GoalEventCard;
