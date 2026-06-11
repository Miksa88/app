// ============================================================================
// ProgramEditorParts — page-local subkomponente ProgramEditor-a
// Izvučeno iz ProgramEditor.tsx (sibling file) bez izmena ponašanja.
// ============================================================================

import { motion, Reorder, useDragControls } from "framer-motion";
import { GripVertical, Layers, Moon, Trash2 } from "lucide-react";
import { ICON_SIZE, IOS_SWITCH } from "@/lib/design-tokens";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { type Program, type ProgramDay, type MesocycleConfig, type MesoProgression, type MesoPeriodization } from "@/data/trainingMockData";

// ============================================================================
// TypeCard — Fiksni / Kalendar selector
// ============================================================================

interface TypeCardProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  caption: string;
}

export const TypeCard = ({ active, onClick, icon, label, caption }: TypeCardProps) => (
  <motion.button
    type="button"
    whileTap={{ scale: TAP_SCALE.primary }}
    onClick={onClick}
    className={`rounded-2xl p-4 text-left transition-colors min-h-[100px] border-2 ${
      active
        ? "bg-card border-primary"
        : "bg-card border-transparent card-shadow active:opacity-70"
    }`}
  >
    <div className={`mb-2 ${active ? "text-primary" : "text-muted-foreground"}`}>{icon}</div>
    <p className={`text-body font-bold ${active ? "text-primary" : "text-foreground/90"}`}>
      {label}
    </p>
    <p className={`text-caption-2 mt-0.5 leading-snug ${active ? "text-primary/80" : "text-muted-foreground"}`}>
      {caption}
    </p>
  </motion.button>
);

// ============================================================================
// DayRow — draggable day in schedule
// ============================================================================

export interface DayRowProps {
  day: ProgramDay;
  index: number;
  programType: Program["type"];
  workoutLookup: Array<{ id: string; sections: Array<{ exercises: unknown[] }> }>;
  onRemove: () => void;
  onPickWorkout: () => void;
  onMarkRest: () => void;
  t: (key: string) => string;
}

// iOS-locale short weekday names (Mon-Sun cycle)
const WEEKDAY_KEYS = [
  "training.weekdayMon",
  "training.weekdayTue",
  "training.weekdayWed",
  "training.weekdayThu",
  "training.weekdayFri",
  "training.weekdaySat",
  "training.weekdaySun",
];

export const DayRow = ({ day, index, programType, workoutLookup, onRemove, onPickWorkout, onMarkRest, t }: DayRowProps) => {
  const dragControls = useDragControls();
  const exerciseCount = day.workoutId
    ? workoutLookup.find((w) => w.id === day.workoutId)?.sections.reduce((sum, s) => sum + s.exercises.length, 0) ?? 0
    : 0;
  // Fixed: prikaz weekday-only (Mon, Tue...). Calendar: "Dan N (u nedelji X)".
  const weekdayLabel = programType === "fixed" ? t(WEEKDAY_KEYS[index % 7]) : null;
  const calendarLabel = programType === "calendar"
    ? `${t("training.day")} ${(index % 7) + 1}`
    : null;

  return (
    <Reorder.Item
      value={day}
      dragListener={false}
      dragControls={dragControls}
      className={`relative rounded-2xl card-shadow overflow-hidden touch-manipulation ${
        day.isRest ? "bg-muted/30" : "bg-card"
      }`}
      whileDrag={{
        scale: 1.03,
        boxShadow: "0 16px 40px -8px rgba(0,0,0,0.22)",
        // z-modal token (100) — drži se iznad svih sibling card-ica i kontejner overlay-a
        zIndex: 100,
      }}
      style={{ position: "relative" }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          className="min-w-8 min-h-8 flex items-center justify-center text-muted-foreground/40 active:text-muted-foreground active:bg-muted/40 rounded-md touch-none cursor-grab active:cursor-grabbing shrink-0"
          aria-label={t("training.dragReorder")}
        >
          <GripVertical size={16} aria-hidden />
        </button>

        {/* Tone rail (primary for workout, muted for rest) */}
        <span
          className={`w-1 h-8 rounded-full shrink-0 ${day.isRest ? "bg-muted-foreground/30" : "bg-primary"}`}
          aria-hidden
        />

        {/* Content — tap to pick workout (if not rest) */}
        <button
          type="button"
          onClick={onPickWorkout}
          className="flex-1 min-w-0 text-left active:opacity-60 transition-opacity"
        >
          <p className="text-body font-semibold text-foreground truncate">
            {weekdayLabel && <span>{weekdayLabel}</span>}
            {calendarLabel && <span>{calendarLabel}</span>}
            <span className="text-muted-foreground font-normal">: </span>
            {day.isRest ? t("training.restDay") : day.workoutName}
          </p>
          {!day.isRest && exerciseCount > 0 && (
            <p className="text-caption-1 text-muted-foreground">
              {exerciseCount} {exerciseCount === 1 ? t("training.exerciseSingular") : t("training.exercisePlural")}
            </p>
          )}
          {day.isRest && (
            <p className="text-caption-1 text-muted-foreground">{t("training.tapToAddWorkout")}</p>
          )}
        </button>

        {/* Convert to rest (only for workout days) */}
        {!day.isRest && (
          <button
            type="button"
            onClick={onMarkRest}
            className="min-w-10 min-h-10 flex items-center justify-center rounded-full active:bg-muted/50 text-muted-foreground/70 shrink-0"
            aria-label={t("training.markAsRest")}
          >
            <Moon size={14} />
          </button>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          className="min-w-10 min-h-10 flex items-center justify-center rounded-full active:bg-destructive/10 shrink-0"
          aria-label={t("common.delete")}
        >
          <Trash2 size={ICON_SIZE.xs} className="text-destructive/70" />
        </button>
      </div>
    </Reorder.Item>
  );
};

// ============================================================================
// StaticDayRow — locked prvi dan mezo bloka (ne učestvuje u drag-reorder)
// ============================================================================

export const StaticDayRow = ({ day, index, programType, workoutLookup, onRemove, onPickWorkout, onMarkRest, t }: DayRowProps) => {
  const exerciseCount = day.workoutId
    ? workoutLookup.find((w) => w.id === day.workoutId)?.sections.reduce((sum, s) => sum + s.exercises.length, 0) ?? 0
    : 0;
  const weekdayLabel = programType === "fixed" ? t(WEEKDAY_KEYS[index % 7]) : null;
  const calendarLabel = programType === "calendar"
    ? `${t("training.day")} ${(index % 7) + 1}`
    : null;

  return (
    <div
      className={`rounded-2xl card-shadow overflow-hidden ${day.isRest ? "bg-muted/30" : "bg-card"}`}
    >
      <div className="flex items-center gap-2 p-3">
        {/* Lock indicator umesto drag handle-a */}
        <span
          className="min-w-8 min-h-8 flex items-center justify-center text-primary/50 shrink-0"
          aria-label={t("training.firstDayLocked")}
        >
          <Layers size={14} aria-hidden />
        </span>
        <span
          className={`w-1 h-8 rounded-full shrink-0 ${day.isRest ? "bg-muted-foreground/30" : "bg-primary"}`}
          aria-hidden
        />
        <button
          type="button"
          onClick={onPickWorkout}
          className="flex-1 min-w-0 text-left active:opacity-60 transition-opacity"
        >
          <p className="text-body font-semibold text-foreground truncate">
            {weekdayLabel && <span>{weekdayLabel}</span>}
            {calendarLabel && <span>{calendarLabel}</span>}
            <span className="text-muted-foreground font-normal">: </span>
            {day.isRest ? t("training.restDay") : day.workoutName}
          </p>
          {!day.isRest && exerciseCount > 0 && (
            <p className="text-caption-1 text-muted-foreground">
              {exerciseCount} {exerciseCount === 1 ? t("training.exerciseSingular") : t("training.exercisePlural")}
            </p>
          )}
          {day.isRest && (
            <p className="text-caption-1 text-muted-foreground">{t("training.tapToAddWorkout")}</p>
          )}
        </button>
        {!day.isRest && (
          <button
            type="button"
            onClick={onMarkRest}
            className="min-w-10 min-h-10 flex items-center justify-center rounded-full active:bg-muted/50 text-muted-foreground/70 shrink-0"
            aria-label={t("training.markAsRest")}
          >
            <Moon size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="min-w-10 min-h-10 flex items-center justify-center rounded-full active:bg-destructive/10 shrink-0"
          aria-label={t("common.delete")}
        >
          <Trash2 size={ICON_SIZE.xs} className="text-destructive/70" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MesoConfigCard — config za jedan mezociklus blok
// ============================================================================

interface MesoConfigCardProps {
  config: MesocycleConfig;
  defaultName: string;
  onUpdate: (patch: Partial<MesocycleConfig>) => void;
  t: (key: string) => string;
}

export const MesoConfigCard = ({ config, defaultName, onUpdate, t }: MesoConfigCardProps) => {
  const weeks: Array<4 | 5 | 6 | 7> = [4, 5, 6, 7];
  const progressions: MesoProgression[] = ["linear", "double", "rpe", "percentage"];
  const periodizations: MesoPeriodization[] = ["linear", "undulating", "block", "dup"];

  return (
    <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-4 card-shadow">
      {/* Naziv */}
      <div>
        <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">
          {t("training.mesoName")}
        </label>
        <input
          type="text"
          value={config.name ?? ""}
          onChange={(e) => onUpdate({ name: e.target.value || undefined })}
          placeholder={defaultName}
          className="w-full bg-background-secondary text-foreground rounded-xl px-3 py-2.5 text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Trajanje (nedelja) */}
      <div>
        <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">
          {t("training.mesoDuration")}
        </label>
        <div className="flex gap-2">
          {weeks.map((w) => {
            const active = config.weeks === w;
            return (
              <button
                key={w}
                type="button"
                onClick={() => onUpdate({ weeks: w })}
                className={`flex-1 min-h-11 rounded-xl text-footnote font-bold transition-colors border-2 ${
                  active ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-background-secondary text-foreground"
                }`}
              >
                {w}
              </button>
            );
          })}
        </div>
        <p className="text-caption-2 text-muted-foreground/70 mt-1">{t("training.mesoDurationHint")}</p>
      </div>

      {/* Progressive overload */}
      <div>
        <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">
          {t("training.mesoProgression")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {progressions.map((p) => {
            const active = config.progression === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onUpdate({ progression: p })}
                className={`min-h-11 rounded-xl text-footnote font-semibold transition-colors border-2 px-3 ${
                  active ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-background-secondary text-foreground"
                }`}
              >
                {t(`training.progression_${p}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Periodizacija */}
      <div>
        <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block">
          {t("training.mesoPeriodization")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {periodizations.map((p) => {
            const active = config.periodization === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onUpdate({ periodization: p })}
                className={`min-h-11 rounded-xl text-footnote font-semibold transition-colors border-2 px-3 ${
                  active ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-background-secondary text-foreground"
                }`}
              >
                {t(`training.periodization_${p}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deload toggle */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-body font-medium text-foreground">{t("training.mesoDeload")}</p>
          <p className="text-caption-2 text-muted-foreground/80">{t("training.mesoDeloadHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => onUpdate({ deload: config.deload === "off" ? "auto" : "off" })}
          aria-pressed={config.deload !== "off"}
          aria-label={t("training.mesoDeload")}
          className={`${IOS_SWITCH.track} rounded-full p-[2px] transition-colors shrink-0 ml-3 ${
            config.deload !== "off" ? "bg-primary" : "bg-muted"
          }`}
        >
          <motion.div
            animate={{ x: config.deload !== "off" ? 20 : 0 }}
            transition={IOS_SPRING.precise}
            className={`${IOS_SWITCH.thumb} rounded-full bg-white shadow-sm`}
          />
        </button>
      </div>

      <p className="text-caption-2 text-muted-foreground/70 leading-snug border-t border-border/40 pt-3">
        {t("training.mesoAlgorithmHint")}
      </p>
    </div>
  );
};

