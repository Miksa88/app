import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { fadeUp, IOS_SPRING, MOTION_EASE, MOTION_DURATION } from "@/lib/motion";
import { PageHeader } from "@/components/PageHeader";
import { ChevronDown, MoreHorizontal, Plus, Trash2, GripVertical } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { WorkoutSection, WorkoutExerciseItem, SECTION_TYPES } from "@/data/trainingMockData";
import type { ExerciseItem } from "@/hooks/useExercises";
import { useWorkout, useUpsertWorkout } from "@/hooks/useWorkouts";
import { useToast } from "@/hooks/use-toast";
import ExercisePicker from "./ExercisePicker";

const WorkoutEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { toast } = useToast();
  const isNew = id === "new" || !id;
  const isAI = searchParams.get("ai") === "true";
  const { data: existing } = useWorkout(isNew ? null : id);
  const upsertWorkoutMutation = useUpsertWorkout();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<WorkoutSection[]>([]);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setSections(existing.sections);
    }
  }, [existing]);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [pickerTargetSection, setPickerTargetSection] = useState<string | null>(null);
  const [showSectionSheet, setShowSectionSheet] = useState(false);
  const [showSectionMenu, setShowSectionMenu] = useState<string | null>(null);

  const toggleCollapse = (sectionId: string) => {
    const next = new Set(collapsedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    setCollapsedSections(next);
  };

  const addSection = (type: WorkoutSection["type"]) => {
    const nameMap: Record<string, string> = {
      regular: "Main", warmup: "Warmup", cooldown: "Cooldown",
      superset: `Superset ${String.fromCharCode(65 + sections.length)}`,
      circuit: "Circuit", amrap: "AMRAP", interval: "Interval",
    };
    setSections([...sections, {
      id: `s-${Date.now()}`,
      name: nameMap[type] || "Section",
      type,
      exercises: [],
    }]);
    setShowSectionSheet(false);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId));
    setShowSectionMenu(null);
  };

  const removeExercise = (sectionId: string, exerciseId: string) => {
    setSections(sections.map((s) =>
      s.id === sectionId ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) } : s
    ));
  };

  const reorderExercises = (sectionId: string, nextExercises: WorkoutExerciseItem[]) => {
    // KRITIČNO: ne mutiramo `order` u state tokom drag-a — framer Reorder prati items
    // preko reference equality na `value`. Ako pravimo nove objekte (`{...e, order: i}`),
    // framer gubi tracking i drugi items se kreću nasumično. `order` se računa pri save-u.
    setSections(sections.map((s) =>
      s.id === sectionId ? { ...s, exercises: nextExercises } : s
    ));
  };

  const updateExerciseField = (sectionId: string, exerciseId: string, field: keyof WorkoutExerciseItem, value: WorkoutExerciseItem[keyof WorkoutExerciseItem]) => {
    setSections(sections.map((s) =>
      s.id === sectionId
        ? {
            ...s,
            exercises: s.exercises.map((e) => (e.id === exerciseId ? { ...e, [field]: value } : e)),
          }
        : s
    ));
  };

  const handleExercisesSelected = (selected: ExerciseItem[]) => {
    if (!pickerTargetSection && sections.length === 0) {
      const newSection: WorkoutSection = {
        id: `s-${Date.now()}`, name: "Main", type: "regular", exercises: [],
      };
      const exercises: WorkoutExerciseItem[] = selected.map((ex, i) => ({
        id: `e-${Date.now()}-${i}`, exerciseId: ex.id, name: ex.name,
        sets: 3, reps: "10-12", weight: "", rest: "60s", notes: "", order: i,
      }));
      newSection.exercises = exercises;
      setSections([newSection]);
    } else {
      const targetId = pickerTargetSection || sections[sections.length - 1]?.id;
      if (!targetId) return;
      setSections(sections.map((s) => {
        if (s.id !== targetId) return s;
        const newExercises: WorkoutExerciseItem[] = selected.map((ex, i) => ({
          id: `e-${Date.now()}-${i}`, exerciseId: ex.id, name: ex.name,
          sets: 3, reps: "10-12", weight: "", rest: "60s", notes: "", order: s.exercises.length + i,
        }));
        return { ...s, exercises: [...s.exercises, ...newExercises] };
      }));
    }
    setShowExercisePicker(false);
    setPickerTargetSection(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: t("training.nameRequired"), variant: "destructive" });
      return;
    }
    try {
      await upsertWorkoutMutation.mutateAsync({
        id: isNew ? undefined : id,
        name,
        description: description || null,
        sections,
      });
      toast({ title: isNew ? t("training.workoutCreated") : t("training.workoutSaved") });
      navigate(-1);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Save failed",
        variant: "destructive",
      });
    }
  };

  if (showExercisePicker) {
    return (
      <ExercisePicker
        onDone={handleExercisesSelected}
        onBack={() => { setShowExercisePicker(false); setPickerTargetSection(null); }}
      />
    );
  }

  const getSectionTone = (type: string): { pill: string; dot: string; bg: string; rail: string } => {
    // "regular" (Main) = brand primary (najvažnija sekcija treninga)
    if (type === "regular") return { pill: "bg-primary/15 text-primary", dot: "bg-primary", bg: "bg-primary/10", rail: "bg-primary" };
    if (type === "warmup") return { pill: "bg-warning/15 text-warning", dot: "bg-warning", bg: "bg-warning/10", rail: "bg-warning" };
    if (type === "cooldown") return { pill: "bg-info/15 text-info", dot: "bg-info", bg: "bg-info/10", rail: "bg-info" };
    // superset = primary variant sa accent nijansom (za razliku od regular)
    if (type === "superset") return { pill: "bg-primary/15 text-primary", dot: "bg-primary", bg: "bg-primary/10", rail: "bg-primary" };
    if (type === "circuit") return { pill: "bg-success/15 text-success", dot: "bg-success", bg: "bg-success/10", rail: "bg-success" };
    if (type === "amrap") return { pill: "bg-destructive/15 text-destructive", dot: "bg-destructive", bg: "bg-destructive/10", rail: "bg-destructive" };
    if (type === "interval") return { pill: "bg-info/15 text-info", dot: "bg-info", bg: "bg-info/10", rail: "bg-info" };
    return { pill: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/50", bg: "bg-muted/40", rail: "bg-muted-foreground/30" };
  };

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      {/* Editor: samo sticky back + Save. Naziv workout-a ide kao FIXED H1 ispod (user edituje ga).
          Nije deo collapsing nav jer bi se poklopio sa inline input-om za ime. */}
      <PageHeader
        onBack={() => navigate(-1)}
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


      <div className="px-5 pt-4 space-y-4">
        {/* AI placeholder */}
        {isAI && isNew && (
          <motion.div {...fadeUp()} className="bg-card rounded-xl p-4 card-shadow">
            <p className="text-body font-medium text-foreground mb-2">{t("training.aiGenerate")}</p>
            <Textarea
              rows={3}
              placeholder={t("training.aiPlaceholder")}
              className="bg-background-secondary card-shadow-none shadow-none rounded-xl"
            />
            <button disabled className="mt-3 w-full bg-muted text-muted-foreground py-3 rounded-xl text-body font-medium opacity-50">
              {t("training.generate")}
            </button>
          </motion.div>
        )}

        {/* Hero — naslov + opis kao clean iOS editorial header, bez card frame-a */}
        <motion.div {...fadeUp(0.05)} className="pt-1 pb-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("training.workoutName")}
            className="text-large-title tracking-tight bg-transparent shadow-none card-shadow-none rounded-none h-auto px-0 py-0 font-bold focus-visible:ring-0 placeholder:text-muted-foreground/40 leading-tight"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t("training.workoutDescription")}
            className="mt-1 text-subhead text-muted-foreground bg-transparent shadow-none card-shadow-none rounded-none px-0 py-0 min-h-0 resize-none placeholder:text-muted-foreground/50 leading-snug"
          />
        </motion.div>

        {/* Sections + exercises */}
        <div className="space-y-4">
          {sections.map((section, sIdx) => {
            const isCollapsed = collapsedSections.has(section.id);
            const tone = getSectionTone(section.type);
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px 0px -40px 0px" }}
                transition={{ duration: 0.3, ease: MOTION_EASE.iosDefault, delay: sIdx * 0.04 }}
              >
                {/* Section header — tinted LABEL (flat, bez card-shadow) za jasnu parent-child hijerarhiju */}
                <div className={`rounded-xl flex items-center min-h-[44px] ${tone.bg}`}>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(section.id)}
                    className="flex-1 flex items-center gap-2.5 min-w-0 pl-3.5 pr-2 py-2.5 active:opacity-60 transition-opacity text-left"
                  >
                    <span className={`w-1 h-4 rounded-full shrink-0 ${tone.rail}`} aria-hidden />
                    <span className="text-subhead font-bold text-foreground uppercase tracking-wider truncate">{section.name}</span>
                    <span className="text-caption-2 text-muted-foreground ml-auto shrink-0">
                      {section.exercises.length} {section.exercises.length === 1 ? t("training.exerciseSingular") : t("training.exercisePlural")}
                    </span>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0 pr-1.5">
                    <button
                      type="button"
                      onClick={() => setShowSectionMenu(section.id)}
                      className="min-w-10 min-h-10 flex items-center justify-center rounded-full text-muted-foreground/70 active:bg-foreground/5"
                      aria-label={t("training.sectionMenu")}
                      aria-haspopup="dialog"
                    >
                      <MoreHorizontal size={ICON_SIZE.xs} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(section.id)}
                      className="min-w-10 min-h-10 flex items-center justify-center text-muted-foreground/70 active:bg-foreground/5 rounded-full"
                      aria-label={isCollapsed ? t("training.expand") : t("training.collapse")}
                      aria-expanded={!isCollapsed}
                    >
                      <motion.span
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: MOTION_DURATION.fast }}
                        className="flex items-center justify-center"
                      >
                        <ChevronDown size={ICON_SIZE.xs} />
                      </motion.span>
                    </button>
                  </div>
                </div>

                {/* Exercises in section — indent sa tone rail-om za parent-child hijerarhiju */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: MOTION_EASE.iosDefault }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 ml-3 pl-3 border-l-2 border-border/40">
                        <Reorder.Group
                          axis="y"
                          values={section.exercises}
                          onReorder={(next) => reorderExercises(section.id, next)}
                          className="space-y-2"
                        >
                          {section.exercises.map((ex, exIdx) => (
                            <ExerciseRow
                              key={ex.id}
                              ex={ex}
                              exIdx={exIdx}
                              sectionId={section.id}
                              onRemove={removeExercise}
                              onUpdate={updateExerciseField}
                              t={t}
                            />
                          ))}
                        </Reorder.Group>

                        {/* Add exercise to this section — iOS inline action */}
                        <button
                          onClick={() => { setPickerTargetSection(section.id); setShowExercisePicker(true); }}
                          className="w-full py-3 mt-2 text-primary text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1"
                        >
                          <Plus size={14} />
                          {t("training.addExerciseToSection")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Empty state — kada nema sekcija */}
          {sections.length === 0 && (
            <motion.div {...fadeUp(0.15)} className="bg-card rounded-2xl card-shadow p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Plus size={ICON_SIZE.md} className="text-primary" />
              </div>
              <p className="text-body font-medium text-foreground mb-1">{t("training.emptyWorkoutTitle")}</p>
              <p className="text-footnote text-muted-foreground">{t("training.emptyWorkoutSubtitle")}</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom sticky bar — Liquid Glass footer sa dva CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto px-5 pt-3 bg-background-secondary/85 backdrop-blur-xl backdrop-saturate-150 border-t border-border/30"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)" }}
      >
        <div className="flex gap-2">
          <button
            onClick={() => { setPickerTargetSection(null); setShowExercisePicker(true); }}
            className="flex-1 min-h-12 rounded-2xl bg-card card-shadow text-body font-semibold text-foreground active:opacity-70 flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            {t("training.exercise")}
          </button>
          <button
            onClick={() => setShowSectionSheet(true)}
            className="flex-1 min-h-12 rounded-2xl gradient-primary text-primary-foreground text-body font-semibold shadow-fab active:opacity-90 flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            {t("training.section")}
          </button>
        </div>
      </div>

      {/* Section type action sheet */}
      <AnimatePresence>
        {showSectionSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowSectionSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={IOS_SPRING.medium}
              role="dialog"
              aria-modal="true"
              aria-label={t("training.addSection")}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-5 pb-8 max-w-lg mx-auto"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
              <h3 className="text-title-3 text-foreground mb-4">{t("training.addSection")}</h3>
              <div className="space-y-2">
                {SECTION_TYPES.map(({ value, label }) => (
                  <motion.button
                    key={value}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addSection(value as WorkoutSection["type"])}
                    className="w-full bg-background-secondary rounded-xl p-4 text-left text-body font-medium text-foreground"
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
              <button
                onClick={() => setShowSectionSheet(false)}
                className="w-full mt-4 py-3 text-body font-medium text-muted-foreground"
              >
                {t("common.cancel")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Section overflow action sheet — iOS pattern (bottom sheet umesto dropdown) */}
      {showSectionMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 animate-in fade-in duration-200"
            onClick={() => setShowSectionMenu(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("training.sectionMenu")}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-5 pb-8 max-w-lg mx-auto animate-in slide-in-from-bottom-8 duration-300"
          >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
              {(() => {
                const activeSection = sections.find((s) => s.id === showSectionMenu);
                return activeSection ? (
                  <div className="mb-4 px-1">
                    <p className="text-caption-1 text-muted-foreground font-medium">{t("training.section")}</p>
                    <h3 className="text-title-3 text-foreground mt-0.5 truncate">{activeSection.name}</h3>
                  </div>
                ) : null;
              })()}
              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    const id = showSectionMenu;
                    setShowSectionMenu(null);
                    if (id) removeSection(id);
                  }}
                  className="w-full bg-destructive/10 rounded-xl p-4 text-left text-body font-medium text-destructive flex items-center gap-3"
                >
                  <Trash2 size={ICON_SIZE.sm} />
                  {t("training.deleteSection")}
                </motion.button>
              </div>
              <button
                onClick={() => setShowSectionMenu(null)}
                className="w-full mt-4 py-3 text-body font-medium text-muted-foreground"
              >
                {t("common.cancel")}
              </button>
            </div>
          </>
        )}
    </div>
  );
};

// ============================================================================
// ExerciseRow — draggable pojedinačna vežba (Reorder.Item sa drag handle-om)
// ============================================================================

interface ExerciseRowProps {
  ex: WorkoutExerciseItem;
  exIdx: number;
  sectionId: string;
  onRemove: (sectionId: string, exerciseId: string) => void;
  onUpdate: (sectionId: string, exerciseId: string, field: keyof WorkoutExerciseItem, value: WorkoutExerciseItem[keyof WorkoutExerciseItem]) => void;
  t: (key: string) => string;
}

const ExerciseRow = ({ ex, exIdx, sectionId, onRemove, onUpdate, t }: ExerciseRowProps) => {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={ex}
      dragListener={false}
      dragControls={dragControls}
      className="bg-card rounded-2xl card-shadow overflow-hidden touch-manipulation"
      whileDrag={{ scale: 1.02, boxShadow: "0 12px 32px -8px rgba(0,0,0,0.18)", zIndex: 10 }}
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

export default WorkoutEditor;
