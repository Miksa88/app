import { useState } from "react";
import { NavPlusButton } from "@/components/ui/nav-plus-button";
import { NavSearchBar } from "@/components/ui/nav-search-bar";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { EmptyState } from "@/components/ui/empty-state";
import { TabControl } from "@/components/ui/tab-control";
import { Plus, Search, Filter, ChevronRight, Dumbbell, LayoutGrid, BookOpen, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useExercises } from "@/hooks/useExercises";
import { getTagColor } from "@/data/trainingMockData";
import { useWorkouts, type WorkoutRecord } from "@/hooks/useWorkouts";
import { usePrograms } from "@/hooks/usePrograms";

const TrainerTraining = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "programs";
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showNewWorkoutSheet, setShowNewWorkoutSheet] = useState(false);

  const setTab = (tab: string) => setSearchParams({ tab });

  const tabs = [
    { key: "exercises", label: t("training.exercises") },
    { key: "workouts", label: t("training.workouts") },
    { key: "programs", label: t("training.programs") },
  ];

  const { data: exercises = [], isLoading: exercisesLoading } = useExercises();

  const filteredExercises = exercises.filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.category.toLowerCase().includes(search.toLowerCase())
  );

  const { data: workouts = [], isLoading: workoutsLoading } = useWorkouts();
  const { data: programs = [], isLoading: programsLoading } = usePrograms();

  const filteredWorkouts = workouts.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPrograms = programs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getDifficultyColor = (d: string) => {
    if (d === "beginner") return "bg-success/10 text-success";
    if (d === "intermediate") return "bg-warning/10 text-warning";
    return "bg-destructive/10 text-destructive";
  };

  const getExerciseCount = (w: WorkoutRecord) =>
    w.sections.reduce((sum, s) => sum + s.exercises.length, 0);

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      {/* Header */}
      <div className="px-5 pt-14 pb-2">
        <motion.h1 {...fadeUp()} className="text-large-title text-foreground">{t("training.title")}</motion.h1>
      </div>

      {/* Tabs — Segment Control */}
      <motion.div {...fadeUp(0.05)} className="px-5 mb-4">
        <TabControl
          variant="animated"
          layoutId="training-tab-indicator"
          tabs={tabs}
          active={activeTab}
          onChange={setTab}
        />
      </motion.div>

      {/* Search + Add */}
      <motion.div {...fadeUp(0.1)} className="px-5 mb-4 flex gap-2">
        <NavSearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("training.search")}
          containerClassName="flex-1"
        />
        {activeTab === "exercises" && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-11 h-11 bg-card rounded-2xl card-shadow flex items-center justify-center border border-border"
          >
            <Filter size={ICON_SIZE.md} className="text-muted-foreground" />
          </button>
        )}
        <NavPlusButton
          onClick={() => {
            if (activeTab === "exercises") navigate("/trainer/exercise/new");
            else if (activeTab === "workouts") setShowNewWorkoutSheet(true);
            else navigate("/trainer/program/new");
          }}
          aria-label={t("training.addNew")}
        />
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "exercises" && (
          <motion.div
            key="exercises"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-5 space-y-2"
          >
            {exercisesLoading ? (
              <div className="flex items-center justify-center py-12" aria-live="polite">
                <Loader2 size={ICON_SIZE.md} className="animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            ) : filteredExercises.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title={t("training.noExercises")}
                cta={{ label: t("training.createExercise"), onClick: () => navigate("/trainer/exercise/new") }}
              />
            ) : (
              filteredExercises.map((ex, i) => (
                <motion.button
                  key={ex.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => navigate(`/trainer/exercise/${ex.id}`)}
                  className="w-full bg-card rounded-2xl p-4 card-shadow flex items-center gap-4 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center text-warning font-bold text-subhead shrink-0">
                    {ex.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">{ex.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-caption-1 text-muted-foreground">{ex.category}</span>
                      <span className={`text-caption-2 font-bold px-2 py-0.5 rounded-full ${getDifficultyColor(ex.difficulty)}`}>
                        {ex.difficulty}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
                </motion.button>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "workouts" && (
          <motion.div
            key="workouts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-5 space-y-2"
          >
            {filteredWorkouts.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title={t("training.noWorkouts")}
                cta={{ label: t("training.createWorkout"), onClick: () => navigate("/trainer/workout/new") }}
              />
            ) : (
              filteredWorkouts.map((w, i) => (
                <motion.button
                  key={w.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => navigate(`/trainer/workout/${w.id}`)}
                  className="w-full bg-card rounded-2xl p-4 card-shadow flex items-center gap-4 text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                    <LayoutGrid size={ICON_SIZE.md} className="text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground">{w.name}</p>
                    <p className="text-caption-1 text-muted-foreground">{getExerciseCount(w)} {t("home.exercises")} · {w.sections.length} {t("training.sections")}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
                </motion.button>
              ))
            )}
          </motion.div>
        )}

        {activeTab === "programs" && (
          <motion.div
            key="programs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-5 space-y-2"
          >
            {filteredPrograms.length === 0 ? (
              <EmptyState
                icon={Dumbbell}
                title={t("training.noPrograms")}
                cta={{ label: t("training.createProgram"), onClick: () => navigate("/trainer/program/new") }}
              />
            ) : (
              filteredPrograms.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => navigate(`/trainer/program/${p.id}`)}
                  className="w-full bg-card rounded-2xl p-4 card-shadow text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                      <BookOpen size={ICON_SIZE.md} className="text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground">{p.name}</p>
                      <p className="text-caption-1 text-muted-foreground">
                        {p.workoutDays.filter((d) => !d.isRest).length} {t("training.workoutsLabel")} · {p.type === "fixed" ? t("training.fixed") : t("training.calendar")}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
                  </div>
                  {p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-[3.25rem]">
                      {p.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className={`text-caption-2 font-bold px-2 py-0.5 rounded-full ${getTagColor(tag)}`}>
                          {tag}
                        </span>
                      ))}
                      {p.tags.length > 4 && (
                        <span className="text-caption-2 text-muted-foreground">+{p.tags.length - 4}</span>
                      )}
                    </div>
                  )}
                </motion.button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Workout Action Sheet */}
      <AnimatePresence>
        {showNewWorkoutSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setShowNewWorkoutSheet(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={IOS_SPRING.medium}
              role="dialog"
              aria-modal="true"
              aria-label={t("training.newWorkout")}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-5 pb-8 max-w-lg mx-auto"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" />
              <h3 className="text-title-3 text-foreground mb-4">{t("training.newWorkout")}</h3>
              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => { setShowNewWorkoutSheet(false); navigate("/trainer/workout/new"); }}
                  className="w-full bg-muted/40 rounded-2xl p-4 text-left border border-border/50"
                >
                  <p className="text-body font-semibold text-foreground">{t("training.blankWorkout")}</p>
                  <p className="text-caption-1 text-muted-foreground mt-0.5">{t("training.blankWorkoutDesc")}</p>
                </motion.button>
                <motion.button
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => setShowNewWorkoutSheet(false)}
                  className="w-full bg-muted/40 rounded-2xl p-4 text-left border border-border/50"
                >
                  <p className="text-body font-semibold text-foreground">{t("training.fromTemplate")}</p>
                  <p className="text-caption-1 text-muted-foreground mt-0.5">{t("training.fromTemplateDesc")}</p>
                </motion.button>
                <motion.button
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => { setShowNewWorkoutSheet(false); navigate("/trainer/workout/new?ai=true"); }}
                  className="w-full bg-muted/40 rounded-2xl p-4 text-left border border-border/50"
                >
                  <p className="text-body font-semibold text-foreground">{t("training.aiGenerate")}</p>
                  <p className="text-caption-1 text-muted-foreground mt-0.5">{t("training.aiGenerateDesc")}</p>
                </motion.button>
              </div>
              <button
                onClick={() => setShowNewWorkoutSheet(false)}
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

export default TrainerTraining;
