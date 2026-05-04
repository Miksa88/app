// ============================================================================
// ProgramEditor — Program (workout-scheduling) designer
// ============================================================================
//
// Flow:
//   1. Basic info — name + description
//   2. Program type — "fixed" (same weekly schedule) vs "calendar" (specific dates)
//   3. Targeting — level / goal / frequency / limitations / free trial flag
//      (uses existing ProgramTargeting component)
//   4. Workout schedule — ordered list of days, each links to a workouts.id (DB)
//      OR is a rest day. Drag-to-reorder via Reorder.Group.
//   5. Save + Assign — "Save program" (primary) + "Assign" (navigates to /assign)
//
// Data model (src/data/trainingMockData.ts):
//   Program { id, name, description, type, tags[], workoutDays[] }
//   ProgramDay { id, dayNumber, workoutId, workoutName, isRest }
// ============================================================================

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { Calendar, Grid3x3, Plus, Trash2, Users, GripVertical, Dumbbell, Moon, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { ICON_SIZE } from "@/lib/design-tokens";
import { IOS_SPRING, MOTION_EASE, TAP_SCALE } from "@/lib/motion";
import { type Program, type ProgramDay } from "@/data/trainingMockData";
import { useProgram, useUpsertProgram } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";
import ProgramTargeting, {
  type ProgramSelections,
  buildTagsFromSelections,
  parseTagsToSelections,
} from "@/components/trainer/ProgramTargeting";

// ============================================================================
// Main Component
// ============================================================================

const ProgramEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const isNew = !id || id === "new";
  const { data: existing } = useProgram(isNew ? null : id);
  const { data: availableWorkouts = [] } = useWorkouts();
  const upsertProgramMutation = useUpsertProgram();

  // Basic
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Program["type"]>("fixed");

  // Targeting (derived from tags)
  const [selections, setSelections] = useState<ProgramSelections>({
    experience: null, goal: null, frequency: null, limitations: [], isFreeTrial: false,
  });

  // Schedule
  const [days, setDays] = useState<ProgramDay[]>(defaultSchedule());

  // Sync state when existing program loads from DB
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setType(existing.type);
      setSelections(parseTagsToSelections(existing.tags));
      setDays(existing.workoutDays);
    }
  }, [existing]);

  // Workout picker modal
  const [showWorkoutPicker, setShowWorkoutPicker] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("training.nameRequired"), variant: "destructive" });
      return;
    }
    const persistedDays = days.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    try {
      await upsertProgramMutation.mutateAsync({
        id: isNew ? undefined : id,
        name,
        description: description || null,
        type,
        tags: buildTagsFromSelections(selections),
        workoutDays: persistedDays,
      });
      toast({ title: isNew ? t("training.programCreated") : t("training.programSaved") });
      navigate("/trainer/training");
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : t("training.saveFailed") ?? "Save failed",
        variant: "destructive",
      });
    }
  };

  const handleAssign = () => {
    if (!name.trim()) {
      toast({ title: t("training.nameRequired"), variant: "destructive" });
      return;
    }
    navigate(`/trainer/program/${id || "new"}/assign`);
  };

  const addDay = (isRest: boolean) => {
    const fallbackWorkout = !isRest && availableWorkouts.length > 0 ? availableWorkouts[0] : null;
    setDays([
      ...days,
      {
        id: `pd-${Date.now()}`,
        // dayNumber se računa pri render-u iz indexa (stable references za Reorder)
        dayNumber: 0,
        workoutId: fallbackWorkout?.id ?? null,
        workoutName: isRest ? t("training.restDay") : (fallbackWorkout?.name ?? ""),
        isRest,
      },
    ]);
  };

  const removeDay = (dayId: string) => {
    // Samo filter — ne mutiramo dayNumber da ne bi razbili Reorder identity
    setDays(days.filter((d) => d.id !== dayId));
  };

  const reorderDays = (next: ProgramDay[]) => {
    // KRITIČNO: postavimo `next` direktno bez mutiranja `dayNumber` — framer Reorder
    // prati items preko reference equality u `value`, pa NE smemo praviti nove objekte.
    // dayNumber se računa pri render-u iz indexa.
    setDays(next);
  };

  const selectWorkoutForDay = (dayId: string, workoutId: string) => {
    const workout = availableWorkouts.find((w) => w.id === workoutId);
    if (!workout) return;
    setDays(days.map((d) =>
      d.id === dayId ? { ...d, workoutId, workoutName: workout.name, isRest: false } : d
    ));
    setShowWorkoutPicker(null);
  };

  return (
    <div className="min-h-screen bg-background-secondary pb-28">
      <PageHeader
        onBack={() => navigate("/trainer/training")}
        backLabel={t("training.title")}
        rightAction={
          <button
            onClick={handleSave}
            className="text-primary font-semibold text-body px-3 py-2 min-h-11 flex items-center active:opacity-60"
          >
            {t("training.save")}
          </button>
        }
      />

      <div className="px-5 pt-3 space-y-5">
        {/* Name + description — grouped Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: MOTION_EASE.iosDefault }}
          className="space-y-3"
        >
          <div>
            <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block px-1">
              {t("training.programName")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("training.programNamePlaceholder")}
              className="w-full bg-card text-foreground text-body rounded-xl px-4 py-3 card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block px-1">
              {t("training.description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t("training.descriptionPlaceholder")}
              className="w-full bg-card text-foreground text-body rounded-xl px-4 py-3 card-shadow focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </motion.div>

        {/* Program type picker — 2 cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: MOTION_EASE.iosDefault, delay: 0.05 }}
        >
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block px-1">
            {t("training.programType")}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <TypeCard
              active={type === "fixed"}
              onClick={() => setType("fixed")}
              icon={<Grid3x3 size={ICON_SIZE.sm} />}
              label={t("training.fixed")}
              caption={t("training.fixedDesc")}
            />
            <TypeCard
              active={type === "calendar"}
              onClick={() => setType("calendar")}
              icon={<Calendar size={ICON_SIZE.sm} />}
              label={t("training.calendar")}
              caption={t("training.calendarDesc")}
            />
          </div>
        </motion.div>

        {/* Targeting — ProgramTargeting accordion */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: MOTION_EASE.iosDefault, delay: 0.1 }}
        >
          <ProgramTargeting selections={selections} onChange={setSelections} />
        </motion.div>

        {/* Free trial flag info */}
        {selections.isFreeTrial && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-warning/10 rounded-xl p-3 border border-warning/20"
          >
            <p className="text-caption-1 text-warning-foreground/80 leading-snug">
              {t("training.freeTrialInfo")}
            </p>
          </motion.div>
        )}

        {/* Workout schedule */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: MOTION_EASE.iosDefault, delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-1.5 px-1">
            <label className="text-caption-1 text-muted-foreground font-medium">
              {t("training.schedule")}
            </label>
            <span className="text-caption-2 text-muted-foreground">
              {days.filter((d) => !d.isRest).length}/{days.length} {t("training.workoutsLabel")}
            </span>
          </div>

          <Reorder.Group
            axis="y"
            values={days}
            onReorder={reorderDays}
            className="space-y-2"
          >
            {days.map((day, idx) => (
              <DayRow
                key={day.id}
                day={day}
                index={idx}
                programType={type}
                workoutLookup={availableWorkouts}
                onRemove={() => removeDay(day.id)}
                onPickWorkout={() => setShowWorkoutPicker(day.id)}
                onMarkRest={() => setDays(days.map((d) => d.id === day.id ? { ...d, workoutId: null, workoutName: t("training.restDay"), isRest: true } : d))}
                t={t}
              />
            ))}
          </Reorder.Group>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={() => addDay(false)}
              className="min-h-12 rounded-xl border-2 border-dashed border-primary/30 text-primary text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1.5"
            >
              <Plus size={14} />
              {t("training.addWorkoutDay")}
            </button>
            <button
              type="button"
              onClick={() => addDay(true)}
              className="min-h-12 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1.5"
            >
              <Moon size={14} />
              {t("training.addRestDay")}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Bottom sticky bar: Save + Assign */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto px-5 pt-3 bg-background-secondary/85 backdrop-blur-xl backdrop-saturate-150 border-t border-border/30"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)" }}
      >
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 min-h-12 rounded-2xl gradient-primary text-primary-foreground text-body font-semibold shadow-fab active:opacity-90 flex items-center justify-center gap-1.5"
          >
            {t("training.saveProgram")}
          </button>
          <button
            onClick={handleAssign}
            className="flex-1 min-h-12 rounded-2xl border-2 border-primary text-primary text-body font-semibold active:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <Users size={16} />
            {t("training.assign")}
          </button>
        </div>
      </div>

      {/* Workout picker sheet — iOS bottom sheet pattern */}
      <AnimatePresence>
        {showWorkoutPicker && (
          <>
            <motion.div
              key="picker-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowWorkoutPicker(null)}
            />
            <motion.div
              key="picker-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={IOS_SPRING.medium}
              role="dialog"
              aria-modal="true"
              aria-label={t("training.pickWorkout")}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-5 pb-8 max-w-lg mx-auto max-h-[75vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
              <h3 className="text-title-3 text-foreground mb-3">{t("training.pickWorkout")}</h3>
              <div className="space-y-2">
                {availableWorkouts.length === 0 && (
                  <p className="text-caption-1 text-muted-foreground py-4 text-center">
                    {t("training.noWorkoutsYet") ?? "No workouts yet — create one first."}
                  </p>
                )}
                {availableWorkouts.map((w) => {
                  const exerciseCount = w.sections.reduce((sum, s) => sum + s.exercises.length, 0);
                  return (
                    <motion.button
                      key={w.id}
                      whileTap={{ scale: TAP_SCALE.secondary }}
                      onClick={() => showWorkoutPicker && selectWorkoutForDay(showWorkoutPicker, w.id)}
                      className="w-full bg-background-secondary rounded-xl p-4 text-left active:opacity-70 transition-opacity"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Dumbbell size={ICON_SIZE.xs} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-semibold text-foreground truncate">{w.name}</p>
                          <p className="text-caption-1 text-muted-foreground truncate">
                            {exerciseCount} {exerciseCount === 1 ? t("training.exerciseSingular") : t("training.exercisePlural")}
                            {w.description ? ` · ${w.description}` : ""}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowWorkoutPicker(null)}
                className="w-full mt-4 py-3 text-body font-medium text-muted-foreground"
              >
                {t("common.cancel")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

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

const TypeCard = ({ active, onClick, icon, label, caption }: TypeCardProps) => (
  <motion.button
    type="button"
    whileTap={{ scale: TAP_SCALE.primary }}
    animate={{
      scale: active ? 1 : 0.98,
    }}
    transition={IOS_SPRING.snappy}
    onClick={onClick}
    className={`rounded-2xl p-4 text-left transition-colors min-h-[100px] relative overflow-hidden ${
      active
        ? "bg-primary/8 ring-2 ring-primary shadow-fab"
        : "bg-card card-shadow active:opacity-70 ring-2 ring-transparent"
    }`}
  >
    {active && (
      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
        <Check size={12} strokeWidth={3} />
      </span>
    )}
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

interface DayRowProps {
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

const DayRow = ({ day, index, programType, workoutLookup, onRemove, onPickWorkout, onMarkRest, t }: DayRowProps) => {
  const dragControls = useDragControls();
  const exerciseCount = day.workoutId
    ? workoutLookup.find((w) => w.id === day.workoutId)?.sections.reduce((sum, s) => sum + s.exercises.length, 0) ?? 0
    : 0;
  const dayNumber = index + 1;
  const weekdayLabel = programType === "fixed" && index < 7 ? t(WEEKDAY_KEYS[index]) : null;

  return (
    <Reorder.Item
      value={day}
      dragListener={false}
      dragControls={dragControls}
      className={`rounded-2xl card-shadow overflow-hidden touch-manipulation ${
        day.isRest ? "bg-muted/30" : "bg-card"
      }`}
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 32px -8px rgba(0,0,0,0.18)", zIndex: 10 }}
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
            {t("training.day")} {dayNumber}
            {weekdayLabel && <span className="text-muted-foreground font-normal"> · {weekdayLabel}</span>}
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
// Helpers
// ============================================================================

function defaultSchedule(): ProgramDay[] {
  // 3-day default (Mon/Wed/Fri style)
  return [
    { id: `pd-${Date.now()}-1`, dayNumber: 1, workoutId: null, workoutName: "Rest", isRest: false },
    { id: `pd-${Date.now()}-2`, dayNumber: 2, workoutId: null, workoutName: "Rest", isRest: true },
    { id: `pd-${Date.now()}-3`, dayNumber: 3, workoutId: null, workoutName: "Rest", isRest: false },
  ];
}

export default ProgramEditor;
