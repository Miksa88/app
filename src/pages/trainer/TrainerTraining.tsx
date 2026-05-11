import { useState } from "react";
import { NavPlusButton } from "@/components/ui/nav-plus-button";
import { NavSearchBar } from "@/components/ui/nav-search-bar";
import { PageTitle } from "@/components/PageTitle";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { EmptyState } from "@/components/ui/empty-state";
import { TabControl } from "@/components/ui/tab-control";
import { Filter, ChevronRight, Dumbbell, LayoutGrid, BookOpen, Loader2, Lock, FilePlus, Copy } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useExercises } from "@/hooks/useExercises";
import { getTagColor } from "@/data/trainingMockData";
import { MASTER_PROGRAMS } from "@/data/masterPrograms";
import { MASTER_WORKOUTS } from "@/data/masterWorkouts";
import { getDefaultLevel } from "@/utils/defaultAssignment";
import { useWorkouts, type WorkoutRecord } from "@/hooks/useWorkouts";
import { usePrograms, type ProgramRecord } from "@/hooks/usePrograms";

// Pretvara backend tag (`beginner`, `3_days_week`, `safe_knees`) u user-friendly label.
function formatTag(tag: string): string {
  if (tag.startsWith("safe_")) return `Safe: ${formatTag(tag.replace("safe_", ""))}`;
  const map: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    foundation: "Foundation",
    upper_lower: "Upper/Lower",
    full_body: "Full Body",
    upper: "Upper",
    lower: "Lower",
    heavy: "Heavy",
    volume: "Volume",
    fat_loss: "Fat Loss",
    figure: "Figure",
    health: "Health",
    muscle_gain: "Muscle Gain",
    free_trial: "Free Trial",
    "3_days_week": "3 days/wk",
    "4_days_week": "4 days/wk",
    "5_days_week": "5 days/wk",
  };
  if (map[tag]) return map[tag];
  // Fallback: snake_case → Title Case (npr. "no_pork" → "No Pork")
  return tag.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const TrainerTraining = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "programs";
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  // + sheet — bira između "Novi prazan" ili "Klon iz default" (workouts/programs).
  const [addSheetMode, setAddSheetMode] = useState<null | "menu" | "workout-clone" | "program-clone">(null);

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

  const { data: workouts = [] } = useWorkouts();
  const { data: programs = [] } = usePrograms();

  // Master-spec default programi i workouts — prikazani sa "Default" badge + Lock.
  // Tap → klone u trener-ownan red, otvara editor sa kopijom.
  const defaultPrograms: (ProgramRecord & { isDefault: true })[] = MASTER_PROGRAMS.map((p) => ({
    id: `default-${p.id}`,
    trainerId: "system",
    name: p.name,
    description: p.description,
    type: p.type,
    tags: p.tags,
    workoutDays: p.workoutDays,
    isArchived: false,
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
    isDefault: true,
  }));

  const defaultWorkouts: (WorkoutRecord & { isDefault: true })[] = MASTER_WORKOUTS.map((w) => ({
    id: `default-${w.id}`,
    trainerId: "system",
    name: w.name,
    description: w.description,
    sections: w.sections,
    isArchived: false,
    createdAt: w.createdAt,
    updatedAt: w.createdAt,
    isDefault: true,
  }));

  const matches = (s: string) => s.toLowerCase().includes(search.toLowerCase());
  const filteredWorkouts = [...workouts, ...defaultWorkouts].filter((w) => matches(w.name));
  const filteredPrograms = [...programs, ...defaultPrograms].filter((p) => matches(p.name));

  // Tap na default karticu = direktno otvara editor (prefilled iz master template-a).
  // Trener bira u editoru: izaći bez čuvanja ili Save → kopija u svojoj biblioteci.
  const openDefault = (kind: "program" | "workout", id: string) => {
    if (kind === "program") navigate(`/trainer/program/${id}`);
    else navigate(`/trainer/workout/${id}`);
  };

  const handleAddClick = () => {
    if (activeTab === "exercises") {
      navigate("/trainer/exercise/new");
    } else {
      setAddSheetMode("menu");
    }
  };

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
      <PageTitle title={t("training.title")} />

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
          onClick={handleAddClick}
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
              filteredWorkouts.map((w, i) => {
                const isDefault = "isDefault" in w && (w as { isDefault: boolean }).isDefault;
                return (
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
                      <LayoutGrid size={ICON_SIZE.md} className="text-info" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body font-semibold text-foreground truncate">{w.name}</p>
                        {isDefault && (
                          <span className="text-caption-2 font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1 shrink-0">
                            <Lock size={10} aria-hidden="true" />
                            {t("training.defaultBadge")}
                          </span>
                        )}
                      </div>
                      <p className="text-caption-1 text-muted-foreground">{getExerciseCount(w)} {t("home.exercises")} · {w.sections.length} {t("training.sections")}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
                  </motion.button>
                );
              })
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
              filteredPrograms.map((p, i) => {
                const isDefault = "isDefault" in p && (p as { isDefault: boolean }).isDefault;
                const autoDefaultLevel = getDefaultLevel(p.tags);
                return (
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
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-body font-semibold text-foreground truncate">{p.name}</p>
                          {isDefault && (
                            <span className="text-caption-2 font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1 shrink-0">
                              <Lock size={10} aria-hidden="true" />
                              {t("training.defaultBadge")}
                            </span>
                          )}
                          {!isDefault && autoDefaultLevel && (
                            <span className="text-caption-2 font-bold px-2 py-0.5 rounded-full bg-success/10 text-success shrink-0">
                              {t("training.autoDefaultBadge").replace("{level}", t(`training.level_${autoDefaultLevel}`))}
                            </span>
                          )}
                        </div>
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
                            {formatTag(tag)}
                          </span>
                        ))}
                        {p.tags.length > 4 && (
                          <span className="text-caption-2 text-muted-foreground">+{p.tags.length - 4}</span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* + Add sheet — 2 mode-a: glavni meni (New / Clone) i clone podlista master template-a */}
      <AnimatePresence>
        {addSheetMode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50"
              onClick={() => setAddSheetMode(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={IOS_SPRING.medium}
              role="dialog"
              aria-modal="true"
              aria-label={t("training.addNew")}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl p-5 pb-8 max-w-lg mx-auto max-h-[80vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-5" aria-hidden="true" />
              {addSheetMode === "menu" && (
                <>
                  <h3 className="text-title-3 text-foreground mb-4">
                    {activeTab === "workouts" ? t("training.newWorkout") : t("training.newProgram")}
                  </h3>
                  <div className="space-y-2">
                    <motion.button
                      whileTap={{ scale: TAP_SCALE.secondary }}
                      onClick={() => {
                        setAddSheetMode(null);
                        navigate(activeTab === "workouts" ? "/trainer/workout/new" : "/trainer/program/new");
                      }}
                      className="w-full bg-muted/40 rounded-2xl p-4 text-left border border-border/50 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FilePlus size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-foreground">{t("training.blank")}</p>
                        <p className="text-caption-1 text-muted-foreground mt-0.5">{t("training.blankDesc")}</p>
                      </div>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: TAP_SCALE.secondary }}
                      onClick={() => setAddSheetMode(activeTab === "workouts" ? "workout-clone" : "program-clone")}
                      className="w-full bg-muted/40 rounded-2xl p-4 text-left border border-border/50 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Copy size={ICON_SIZE.md} className="text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-foreground">{t("training.cloneFromDefault")}</p>
                        <p className="text-caption-1 text-muted-foreground mt-0.5">{t("training.cloneFromDefaultDesc")}</p>
                      </div>
                    </motion.button>
                  </div>
                </>
              )}

              {addSheetMode === "workout-clone" && (
                <>
                  <h3 className="text-title-3 text-foreground mb-1">{t("training.cloneFromDefault")}</h3>
                  <p className="text-caption-1 text-muted-foreground mb-4">{t("training.cloneFromDefaultDesc")}</p>
                  <div className="space-y-2">
                    {MASTER_WORKOUTS.map((w) => (
                      <motion.button
                        key={w.id}
                        whileTap={{ scale: TAP_SCALE.secondary }}
                        onClick={() => {
                          setAddSheetMode(null);
                          openDefault("workout", `default-${w.id}`);
                        }}
                        className="w-full bg-background-secondary rounded-xl p-3.5 text-left flex items-center gap-3 active:opacity-70"
                      >
                        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                          <LayoutGrid size={ICON_SIZE.sm} className="text-info" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-semibold text-foreground truncate">{w.name}</p>
                          <p className="text-caption-1 text-muted-foreground truncate">{w.description}</p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" aria-hidden="true" />
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              {addSheetMode === "program-clone" && (
                <>
                  <h3 className="text-title-3 text-foreground mb-1">{t("training.cloneFromDefault")}</h3>
                  <p className="text-caption-1 text-muted-foreground mb-4">{t("training.cloneFromDefaultDesc")}</p>
                  <div className="space-y-2">
                    {MASTER_PROGRAMS.map((p) => (
                      <motion.button
                        key={p.id}
                        whileTap={{ scale: TAP_SCALE.secondary }}
                        onClick={() => {
                          setAddSheetMode(null);
                          openDefault("program", `default-${p.id}`);
                        }}
                        className="w-full bg-background-secondary rounded-xl p-3.5 text-left flex items-center gap-3 active:opacity-70"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen size={ICON_SIZE.sm} className="text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-semibold text-foreground truncate">{p.name}</p>
                          <p className="text-caption-1 text-muted-foreground truncate">{p.description}</p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" aria-hidden="true" />
                      </motion.button>
                    ))}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => setAddSheetMode(addSheetMode === "menu" ? null : "menu")}
                className="w-full mt-4 py-3 text-body font-medium text-muted-foreground"
              >
                {addSheetMode === "menu" ? t("common.cancel") : t("common.back")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrainerTraining;
