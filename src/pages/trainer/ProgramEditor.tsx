// ============================================================================
// ProgramEditor — Program (workout-scheduling) designer
// ============================================================================
//
// Flow:
//   1. Basic info — name + description
//   2. Program type — "fixed" (same weekly schedule) vs "calendar" (specific dates)
//   3. Default-for-level picker — auto-assignment po onboarding nivou (Manual / Beginner / Intermediate / Advanced)
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
import { Calendar, Grid3x3, Plus, Trash2, Users, GripVertical, Dumbbell, Moon, Layers, ChevronDown, Settings2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ICON_SIZE, IOS_SWITCH } from "@/lib/design-tokens";
import { IOS_SPRING, MOTION_DURATION, MOTION_EASE, TAP_SCALE } from "@/lib/motion";
import { type Program, type ProgramDay, type MesocycleConfig, type MesoProgression, type MesoPeriodization } from "@/data/trainingMockData";
import { MASTER_PROGRAMS } from "@/data/masterPrograms";
import { MASTER_WORKOUTS } from "@/data/masterWorkouts";
import { type DefaultLevel, DEFAULT_LEVELS, getDefaultLevel, setDefaultLevel } from "@/utils/defaultAssignment";
import { useProgram, useUpsertProgram } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";

// ============================================================================
// Main Component
// ============================================================================

const ProgramEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  // `default-master-*` ID = master template. Editor učitava iz hardkodirane MASTER_PROGRAMS
  // liste, save uvek pravi NOVI red (ne update). User može da napusti bez čuvanja.
  const isDefault = !!id?.startsWith("default-");
  const defaultSourceId = isDefault ? id!.replace(/^default-/, "") : null;
  const isNew = !id || id === "new" || isDefault;
  const { data: existing } = useProgram(isNew ? null : id);
  const masterTemplate = isDefault ? MASTER_PROGRAMS.find((p) => p.id === defaultSourceId) : null;
  const { data: trainerWorkouts = [] } = useWorkouts();
  // Trener-owned workouts + default master workouts (sa `default-` prefix-om).
  // Day kartice u schedule-u rade lookup preko ovih ID-jeva za prikaz exercise count-a.
  const availableWorkouts = [
    ...trainerWorkouts,
    ...MASTER_WORKOUTS.map((w) => ({
      id: `default-${w.id}`,
      trainerId: "system",
      name: w.name,
      description: w.description,
      sections: w.sections,
      isArchived: false,
      createdAt: w.createdAt,
      updatedAt: w.createdAt,
    })),
  ];
  const upsertProgramMutation = useUpsertProgram();

  // Basic — sve ostalo (nivo, cilj, frekvencija, povrede) algoritam
  // čita iz client onboarding profila pri assign-u.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<Program["type"]>("fixed");
  // Auto-assign po onboarding nivou. null = trener manuelno asajnuje preko "Assign" CTA.
  const [defaultLevel, setDefaultLevelState] = useState<DefaultLevel | null>(null);

  // Schedule
  const [days, setDays] = useState<ProgramDay[]>(defaultSchedule());

  // Koji mezo block je trenutno otvoren (id dana koji je mezo start). Null = svi zatvoreni.
  const [expandedMezoDayId, setExpandedMezoDayId] = useState<string | null>(null);

  const updateMesoConfig = (dayId: string, patch: Partial<MesocycleConfig>) => {
    setDays((prev) => prev.map((d) =>
      d.id === dayId
        ? { ...d, mesocycleConfig: { ...(d.mesocycleConfig ?? {}), ...patch } }
        : d
    ));
  };

  // Sync state when existing program loads from DB. Master template hidracija
  // se radi jednom (template je sinhron iz hardkodirane liste).
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setType(existing.type);
      setDays(existing.workoutDays);
      setDefaultLevelState(getDefaultLevel(existing.tags));
    } else if (masterTemplate) {
      setName(masterTemplate.name);
      setDescription(masterTemplate.description);
      setType(masterTemplate.type);
      setDays(masterTemplate.workoutDays);
      setDefaultLevelState(getDefaultLevel(masterTemplate.tags));
    }
  }, [existing, masterTemplate]);

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
        tags: setDefaultLevel(existing?.tags ?? masterTemplate?.tags ?? [], defaultLevel),
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

  // Fixed program — svaki mezo blok je tačno 7 dana (1 fiksni mikrociklus).
  // Trener dodaje više mezo blokova (Add mezociklus). Cap = 7 × broj mezo blokova.
  // Calendar — svaki mezo može imati N nedelja (microcycles), trener dodaje week-by-week.
  const mezoCount = 1 + days.filter((d) => d.mesocycleStart).length;
  const isFixedFull = type === "fixed" && days.length >= mezoCount * 7;

  const addDay = (isRest: boolean) => {
    if (isFixedFull) return;
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

  // Calendar — dodaj celu nedelju (7 odmornih dana koje trener onda popunjava)
  const addWeek = (asMezoStart = false) => {
    const base = Date.now();
    const week: ProgramDay[] = Array.from({ length: 7 }, (_, i) => ({
      id: `pd-${base}-${i}`,
      dayNumber: 0,
      workoutId: null,
      workoutName: t("training.restDay"),
      isRest: true,
      // Prvi dan novog mezo bloka dobija mesocycleStart marker + default config.
      ...(i === 0 && asMezoStart
        ? { mesocycleStart: true, mesocycleConfig: { weeks: 6, progression: "linear" as const, periodization: "linear" as const, deload: "auto" as const } }
        : {}),
    }));
    setDays([...days, ...week]);
  };

  // Dodaj nov mezociklus blok (samo calendar mode) — 7 odmornih dana,
  // prvi je mezo start sa default config-om. Trener onda otvara config card i menja.
  const addMezoBlock = () => addWeek(true);


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

  // Grupiše dane u mezo blokove. Svaki blok počinje danom sa `mesocycleStart=true`
  // (osim prvog bloka koji počinje na idx 0). Drag-reorder je scoped per blok —
  // sprečava da prevučenje karte slučajno napravi novi mezo (UX bug fix).
  const mezoBlocks: ProgramDay[][] = [];
  {
    let current: ProgramDay[] = [];
    days.forEach((day, idx) => {
      if (idx === 0 || day.mesocycleStart) {
        if (current.length > 0) mezoBlocks.push(current);
        current = [day];
      } else {
        current.push(day);
      }
    });
    if (current.length > 0) mezoBlocks.push(current);
  }

  // Reorder unutar jednog mezo bloka — zamena samo tog slice-a u globalnom `days`.
  // Prvi dan bloka (mezo-start ili idx 0) je locked, pa newOrder sadrži samo tail.
  const reorderInBlock = (blockIdx: number, newTail: ProgramDay[]) => {
    let startIdx = 0;
    for (let i = 0; i < blockIdx; i++) startIdx += mezoBlocks[i].length;
    const blockLen = mezoBlocks[blockIdx].length;
    const nextDays = [...days];
    nextDays.splice(startIdx + 1, blockLen - 1, ...newTail);
    setDays(nextDays);
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

        {/* Default-for picker — auto-assignment po onboarding nivou. Null = manualni assign. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: MOTION_EASE.iosDefault, delay: 0.12 }}
        >
          <label className="text-caption-1 text-muted-foreground font-medium mb-1.5 block px-1">
            {t("training.defaultForLevel")}
          </label>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setDefaultLevelState(null)}
              className={`min-h-12 rounded-xl text-footnote font-semibold transition-colors border-2 px-2 ${
                defaultLevel === null ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-card card-shadow text-foreground"
              }`}
            >
              {t("training.defaultManual")}
            </button>
            {DEFAULT_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDefaultLevelState(lvl)}
                className={`min-h-12 rounded-xl text-footnote font-semibold transition-colors border-2 px-2 ${
                  defaultLevel === lvl ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-card card-shadow text-foreground"
                }`}
              >
                {t(`training.level_${lvl}`)}
              </button>
            ))}
          </div>
          <p className="text-caption-2 text-muted-foreground/80 mt-1.5 px-1 leading-snug">
            {defaultLevel === null
              ? t("training.defaultManualHint")
              : t("training.defaultAutoHint").replace("{level}", t(`training.level_${defaultLevel}`))}
          </p>
        </motion.div>


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

          {/* Schedule render — hijerarhijski po mezo blokovima.
              Svaki blok = banner + config card + lock-ovan prvi dan + Reorder.Group za ostalih.
              Drag je scoped per blok — ne može da pređe granicu mezo-a. */}
          {(() => {
            let globalIdx = 0;
            return mezoBlocks.map((block, blockIdx) => {
              const firstDay = block[0];
              const tail = block.slice(1);
              const blockStartGlobalIdx = globalIdx;
              const mesoCfg = firstDay.mesocycleConfig ?? {};
              const isMezoOpen = expandedMezoDayId === firstDay.id;
              const mezoNumber = blockIdx + 1;
              const node = (
                <div key={`mezo-${firstDay.id}`} className="space-y-2">
                  {/* Mezo banner + config */}
                  <button
                    type="button"
                    onClick={() => setExpandedMezoDayId(isMezoOpen ? null : firstDay.id)}
                    className="w-full flex items-center gap-2 px-1 mt-2 mb-1 active:opacity-60 min-h-9"
                    aria-expanded={isMezoOpen}
                  >
                    <Layers size={14} className="text-primary shrink-0" aria-hidden />
                    <span className="text-caption-1 font-bold text-primary uppercase tracking-wide">
                      {mesoCfg.name?.trim() || `${mezoNumber}. ${t("training.mesocycle")}`}
                    </span>
                    {(mesoCfg.weeks || mesoCfg.progression || mesoCfg.deload) && (
                      <span className="text-caption-2 text-primary/70 font-medium">
                        · {mesoCfg.weeks ? `${mesoCfg.weeks}w` : ""}
                        {mesoCfg.progression ? ` · ${t(`training.progression_${mesoCfg.progression}`)}` : ""}
                      </span>
                    )}
                    <span className="flex-1 h-px bg-primary/20" aria-hidden />
                    <Settings2 size={14} className="text-primary/70 shrink-0" aria-hidden />
                    <motion.span
                      animate={{ rotate: isMezoOpen ? 180 : 0 }}
                      transition={{ duration: MOTION_DURATION.fast }}
                      className="shrink-0"
                    >
                      <ChevronDown size={14} className="text-primary/70" aria-hidden />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isMezoOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.iosDefault }}
                        className="overflow-hidden"
                      >
                        <MesoConfigCard
                          config={mesoCfg}
                          defaultName={`${mezoNumber}. ${t("training.mesocycle")}`}
                          onUpdate={(patch) => updateMesoConfig(firstDay.id, patch)}
                          t={t}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Card kontejner za dane bloka — vizuelno ograđen mezo blok */}
                  <div className="bg-primary/5 rounded-2xl p-2 border border-primary/15 space-y-2">
                    {type === "calendar" && (
                      <div className="flex items-center gap-2 px-2 pt-1">
                        <span className="text-caption-2 font-semibold text-muted-foreground uppercase tracking-wider">
                          {t("training.week")} 1
                        </span>
                        <span className="flex-1 h-px bg-border" aria-hidden />
                      </div>
                    )}
                    {/* Locked first day — ne učestvuje u drag-reorder */}
                    <StaticDayRow
                      day={firstDay}
                      index={blockStartGlobalIdx}
                      programType={type}
                      workoutLookup={availableWorkouts}
                      onRemove={() => removeDay(firstDay.id)}
                      onPickWorkout={() => setShowWorkoutPicker(firstDay.id)}
                      onMarkRest={() => setDays(days.map((d) => d.id === firstDay.id ? { ...d, workoutId: null, workoutName: t("training.restDay"), isRest: true } : d))}
                      t={t}
                    />
                    {/* Reorder.Group SCOPE-OVAN samo na tail bloka */}
                    {tail.length > 0 && (
                      <Reorder.Group
                        axis="y"
                        values={tail}
                        onReorder={(newOrder: ProgramDay[]) => reorderInBlock(blockIdx, newOrder)}
                        className="space-y-2"
                      >
                        {tail.map((day, tailIdx) => {
                          const dayGlobalIdx = blockStartGlobalIdx + 1 + tailIdx;
                          // Week divider unutar bloka (calendar mode) — za multi-week mezo blokove
                          const showInnerWeek = type === "calendar" && (dayGlobalIdx - blockStartGlobalIdx) % 7 === 0;
                          const innerWeekNum = Math.floor((dayGlobalIdx - blockStartGlobalIdx) / 7) + 1;
                          return (
                            <div key={day.id}>
                              {showInnerWeek && (
                                <div className="flex items-center gap-2 px-2 pb-1.5 pt-1">
                                  <span className="text-caption-2 font-semibold text-muted-foreground uppercase tracking-wider">
                                    {t("training.week")} {innerWeekNum}
                                  </span>
                                  <span className="flex-1 h-px bg-border" aria-hidden />
                                </div>
                              )}
                              <DayRow
                                day={day}
                                index={dayGlobalIdx}
                                programType={type}
                                workoutLookup={availableWorkouts}
                                onRemove={() => removeDay(day.id)}
                                onPickWorkout={() => setShowWorkoutPicker(day.id)}
                                onMarkRest={() => setDays(days.map((d) => d.id === day.id ? { ...d, workoutId: null, workoutName: t("training.restDay"), isRest: true } : d))}
                                t={t}
                              />
                            </div>
                          );
                        })}
                      </Reorder.Group>
                    )}
                  </div>
                </div>
              );
              globalIdx += block.length;
              return node;
            });
          })()}

          {/* Add buttons — ponašanje zavisi od tipa programa */}
          {type === "calendar" ? (
            <div className="space-y-2 mt-3">
              {/* Primary action — dodaj nov mezociklus blok (full width) */}
              <button
                type="button"
                onClick={addMezoBlock}
                className="w-full min-h-12 rounded-xl border-2 border-dashed border-primary/40 text-primary text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Layers size={14} />
                {t("training.addMezoBlock")}
              </button>
              {/* Secondary actions — sedmica (u trenutni mezo) i pojedinačni dan */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => addWeek(false)}
                  className="min-h-12 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  {t("training.addWeek")}
                </button>
                <button
                  type="button"
                  onClick={() => addDay(true)}
                  className="min-h-12 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  {t("training.addDay")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              {/* Primary action — dodaj nov mezo blok (7-dnevni mikrociklus) */}
              <button
                type="button"
                onClick={addMezoBlock}
                className="w-full min-h-12 rounded-xl border-2 border-dashed border-primary/40 text-primary text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1.5"
              >
                <Layers size={14} />
                {t("training.addMezoBlock")}
              </button>
              {/* Secondary — fine-tune trenutni mezo (dodaj/izbaci dan u poslednjem) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => addDay(false)}
                  disabled={isFixedFull}
                  className="min-h-12 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                  {t("training.addWorkoutDay")}
                </button>
                <button
                  type="button"
                  onClick={() => addDay(true)}
                  disabled={isFixedFull}
                  className="min-h-12 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground text-footnote font-semibold active:opacity-60 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Moon size={14} />
                  {t("training.addRestDay")}
                </button>
              </div>
            </div>
          )}
          {type === "fixed" && (
            <p className="text-caption-2 text-muted-foreground/80 mt-2 px-1">
              {t("training.fixedMicrocycleHint")}
            </p>
          )}
        </motion.div>
      </div>

      {/* Bottom sticky bar: Save + Assign */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto px-5 pt-3 bg-background-secondary/85 backdrop-blur-xl backdrop-saturate-150 border-t border-border/30"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)" }}
      >
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            variant="cta"
            className="flex-1 rounded-2xl"
          >
            {t("training.saveProgram")}
          </Button>
          {/* Assign CTA samo kad je Default = Manual. Ako je auto-default po nivou,
              algoritam dodeljuje pri onboarding-u — manual assign je ugašen. */}
          {defaultLevel === null && (
            <button
              onClick={handleAssign}
              className="flex-1 min-h-12 rounded-2xl border-2 border-primary text-primary text-body font-semibold active:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <Users size={16} />
              {t("training.assign")}
            </button>
          )}
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

const StaticDayRow = ({ day, index, programType, workoutLookup, onRemove, onPickWorkout, onMarkRest, t }: DayRowProps) => {
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

const MesoConfigCard = ({ config, defaultName, onUpdate, t }: MesoConfigCardProps) => {
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

// ============================================================================
// Helpers
// ============================================================================

function defaultSchedule(): ProgramDay[] {
  // 1 mezociklus, 1 mikrociklus = 7 dana (svi rest po default-u). Trener dodaje workout-e.
  // Dan 1 nosi mesocycleStart marker + default mesocycleConfig (6 nedelja, linear).
  const base = Date.now();
  return Array.from({ length: 7 }, (_, i) => ({
    id: `pd-${base}-${i}`,
    dayNumber: 0,
    workoutId: null,
    workoutName: "Rest",
    isRest: true,
    ...(i === 0
      ? {
          mesocycleStart: true,
          mesocycleConfig: {
            weeks: 6 as const,
            progression: "linear" as const,
            periodization: "linear" as const,
            deload: "auto" as const,
          },
        }
      : {}),
  }));
}

export default ProgramEditor;
