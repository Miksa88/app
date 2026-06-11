import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, MOTION_DURATION, MOTION_EASE } from "@/lib/motion";
import { ArrowLeft, Flame, ChevronRight, ChevronLeft, Dumbbell, UtensilsCrossed, AlertTriangle, Ban, Cake, Briefcase, Clock, Brain, Moon, Frown, CheckCircle2, MessageSquare, Camera, Activity, Award, Target, Ruler, Scale as ScaleIcon } from "lucide-react";
import { useTrainerClients } from "@/hooks/useTrainerClients";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ClientData } from "@/data/trainerMockData";
import { useClientTier, useTrainerClientCard } from "@/hooks/useProfile";
import { useClientActivity } from "@/hooks/useClientActivity";
import { useClientNotes, useCreateClientNote, useDeleteClientNote } from "@/hooks/useClientNotes";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useProgram } from "@/hooks/usePrograms";
import { useQuery } from "@tanstack/react-query";
import { listProgramAssignmentsForClient } from "@/services/programService";
import ClientNutritionPlan from "@/components/trainer/ClientNutritionPlan";
import { ClientUserStatusPanel } from "@/components/queue/ClientUserStatusPanel";
import { SyncRulesOverrideSection } from "@/components/trainer/SyncRulesOverrideSection";
import { PageHeader } from "@/components/PageHeader";
import { UserAvatar } from "@/components/ui/user-avatar";
import TierPromoteSheet from "@/components/trainer/TierPromoteSheet";
import TierBadge from "@/components/profile/TierBadge";
import type { PackageTier } from "@/services/packageService";
import { TabControl } from "@/components/ui/tab-control";
import { Card } from "@/components/ui/card";
import { MotionCard } from "@/components/ui/motion-card";
import EquipmentEditor from "@/components/trainer/EquipmentEditor";
import PauseClientCard from "@/components/trainer/PauseClientCard";

const TABS = ['overview', 'training', 'nutrition', 'checkins', 'settings'] as const;
type Tab = typeof TABS[number];

const ACTIVITY_ICONS: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  '✅': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  '📝': { icon: MessageSquare, color: 'text-info', bg: 'bg-info/10' },
  '🥗': { icon: UtensilsCrossed, color: 'text-success', bg: 'bg-success/10' },
  '📸': { icon: Camera, color: 'text-secondary', bg: 'bg-secondary/10' },
  '💪': { icon: Activity, color: 'text-warning', bg: 'bg-warning/10' },
};

const ClientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Prev/next client navigation — Quick Win #14 (TrueCoach parity)
  const { clients: trainerClients } = useTrainerClients();
  const currentIdx = trainerClients.findIndex((c) => c.id === id);
  const prevClientId = currentIdx > 0 ? trainerClients[currentIdx - 1].id : null;
  const nextClientId =
    currentIdx >= 0 && currentIdx < trainerClients.length - 1
      ? trainerClients[currentIdx + 1].id
      : null;
  // Notes — real DB-backed (client_notes tabela, W-3 finishing)
  const { data: notes = [] } = useClientNotes(id ?? null);
  const createNoteMutation = useCreateClientNote(id ?? null);
  const deleteNoteMutation = useDeleteClientNote(id ?? null);
  const undoNote = useUndoableAction();
  const handleDeleteNote = (note: { id: string; body: string }) => {
    void undoNote.run({
      title: t("clients.notes.deleted"),
      apply: () =>
        new Promise<void>((resolve, reject) =>
          deleteNoteMutation.mutate(note.id, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          }),
        ),
      revert: () =>
        new Promise<void>((resolve, reject) => {
          createNoteMutation.mutate(note.body, {
            onSuccess: () => resolve(),
            onError: (e) => reject(e),
          });
        }),
    });
  };
  const [newNote, setNewNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showTierSheet, setShowTierSheet] = useState(false);
  // Tier iz profiles preko React Query; lokalni override posle promote akcije
  const { data: fetchedTier = null } = useClientTier(id ?? null);
  const [tierOverride, setTierOverride] = useState<PackageTier | null>(null);
  const clientTier = tierOverride ?? fetchedTier;
  const setClientTier = setTierOverride;

  // ClientData kartica iz profiles (mapiranje u profileService.getTrainerClientCard)
  const { data: supabaseClient = null, isLoading: isResolving } = useTrainerClientCard(id ?? null);

  const client = supabaseClient;
  const { data: activityEntries = [] } = useClientActivity(id ?? null);
  const { status: clientStatus } = useUserStatus(id ?? null);

  // Assigned program — citanje iz client_template_assignments.assigned_program_id
  const { data: assignedProgramId } = useQuery({
    queryKey: ["clientProgramAssignment", id ?? "anon"],
    queryFn: () => (id ? listProgramAssignmentsForClient(id) : null),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
  const { data: assignedProgram } = useProgram(assignedProgramId ?? null);

  if (isResolving) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageHeader onBack={() => navigate("/trainer/clients")} backLabel={t("clients.title")} />
        <div className="flex flex-col items-center pt-16">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
          <p className="text-caption-1 text-muted-foreground mt-3">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageHeader onBack={() => navigate("/trainer/clients")} backLabel={t("clients.title")} />
        <motion.div {...fadeUp()} className="px-5 pt-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-muted-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-title-2 font-bold text-foreground mb-2">{t("clients.notFoundTitle")}</h1>
          <p className="text-body text-muted-foreground max-w-xs">{t("clients.notFoundBody")}</p>
          <Button onClick={() => navigate("/trainer/clients")} variant="cta" size="xl" className="mt-6">
            {t("clients.title")}
          </Button>
        </motion.div>
      </div>
    );
  }

  const activities = activityEntries;
  const age = new Date().getFullYear() - new Date(client.dateOfBirth).getFullYear();

  const tabLabels: Record<Tab, string> = {
    overview: t("clients.overview"),
    training: t("clients.training"),
    nutrition: t("clients.nutrition"),
    checkins: t("clients.checkIns"),
    settings: t("clients.settings"),
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await createNoteMutation.mutateAsync(newNote.trim());
      setNewNote('');
      setShowNoteInput(false);
    } catch {
      // toast handling — keep silent for now (caller would have shown error)
    }
  };

  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    trial: { label: t("clients.trial"), color: 'bg-primary/10 text-primary', dot: 'bg-primary' },
    active: { label: t("clients.active"), color: 'bg-success/10 text-success', dot: 'bg-success' },
    paused: { label: t("clients.paused"), color: 'bg-warning/10 text-warning', dot: 'bg-warning' },
    finished: { label: t("clients.finished"), color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  };

  const sc = statusConfig[client.status];
  const typeLabel = client.type === 'online' ? t("clients.online") : client.type === 'in_person' ? t("clients.inPerson") : t("clients.hybrid");

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      {/* iOS-native shell: PageHeader sa contextual "Clients" back label — breadcrumbs uklonjen (WS-8.5 D23) */}
      {/* Identity page — samo sticky Liquid Glass back. Ime je u hero kartici ispod. */}
      <PageHeader
        onBack={() => navigate("/trainer/clients")}
        backLabel={t("clients.title")}
        rightAction={
          (prevClientId || nextClientId) ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => prevClientId && navigate(`/trainer/clients/${prevClientId}`)}
                disabled={!prevClientId}
                className="w-9 h-9 rounded-full bg-card/70 backdrop-blur-xl border border-border/30 flex items-center justify-center disabled:opacity-30"
                aria-label={t("clients.prev")}
              >
                <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
              </button>
              <button
                onClick={() => nextClientId && navigate(`/trainer/clients/${nextClientId}`)}
                disabled={!nextClientId}
                className="w-9 h-9 rounded-full bg-card/70 backdrop-blur-xl border border-border/30 flex items-center justify-center disabled:opacity-30"
                aria-label={t("clients.next")}
              >
                <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          ) : undefined
        }
      />

      {/* Premium Client Header — gradient hero (content area, ne shell) */}
      <motion.div {...fadeUp()} className="px-5 pt-4 pb-5">
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-fab"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)" }}
        >
          <div className="relative">
            <div className="flex items-center gap-4">
              <UserAvatar
                name={client.name}
                size="lg"
                showRing="subtle"
                backgroundClass="bg-white/20 backdrop-blur-sm"
                status={
                  client.status === 'active'
                    ? 'active'
                    : client.status === 'trial'
                    ? 'trial'
                    : 'offline'
                }
                layoutId={`client-avatar-${client.id}`}
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-title-2 font-bold">{client.name}</h1>
                <p className="text-caption-1 opacity-85 truncate">{client.email}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-caption-2 font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                    {sc.label}
                  </span>
                  <span className="text-caption-1 opacity-85">{typeLabel}</span>
                  <button
                    onClick={() => setShowTierSheet(true)}
                    aria-label={t("tier.promote")}
                    className="ml-auto"
                  >
                    {clientTier ? (
                      <TierBadge tier={clientTier} />
                    ) : (
                      <span className="text-caption-2 font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                        + tier
                      </span>
                    )}
                  </button>
                </div>
              </div>
              {client.streak > 0 && (
                <div className="text-center shrink-0 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
                  <div className="flex items-center gap-1 justify-center">
                    <Flame size={ICON_SIZE.xs} aria-hidden="true" />
                    <span className="text-body font-bold tabular-nums">{client.streak}</span>
                  </div>
                  <p className="text-caption-2 opacity-80 uppercase tracking-wider mt-0.5">streak</p>
                </div>
              )}
            </div>

            {/* Program progress */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-caption-1 opacity-85">
                  {t("clients.weekOf")} {client.programWeek} {t("clients.of")} {client.programTotalWeeks}
                </span>
                <span className="text-caption-1 font-semibold tabular-nums">
                  {Math.round((client.programWeek / client.programTotalWeeks) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((client.programWeek / client.programTotalWeeks) * 100)}%` }}
                  transition={{ duration: MOTION_DURATION.xSlow, delay: 0.2, ease: MOTION_EASE.outQuart }}
                  className="h-full rounded-full bg-white"
                />
              </div>
            </div>

            {/* Stat cells */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { icon: Target, label: t("clients.statGoal"), value: client.goals[0] || '—' },
                { icon: Ruler, label: t("clients.statHeight"), value: `${client.height}cm` },
                { icon: ScaleIcon, label: t("clients.statWeight"), value: `${client.weight}kg` },
                { icon: Cake, label: t("clients.statAge"), value: String(age) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl py-2 px-1 text-center">
                  <Icon size={ICON_SIZE.xs} className="mx-auto mb-1 opacity-80" aria-hidden="true" />
                  <p className="text-caption-2 opacity-80 uppercase tracking-wider">{label}</p>
                  <p className="text-caption-1 font-semibold mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab bar — Segment Control style. Sticky ispod PageHeader-a (iOS Contacts pattern).
          Hero kartica klizi gore ispod nav, tabs se zalepe tačno ispod nav bar-a da ne overlap-uju Back button. */}
      <div
        className="sticky z-sticky px-5 py-3 bg-background-secondary/80 backdrop-blur-xl backdrop-saturate-150 mb-4"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 44px)" }}
      >
        <TabControl
          variant="animated"
          layoutId="client-tab-indicator"
          ariaLabel={t("clients.title")}
          tabs={TABS.map((key) => ({ key, label: tabLabels[key] }))}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab content */}
      <div className="px-5">
        {activeTab === 'overview' && (
          <div role="tabpanel" id="client-panel-overview" aria-labelledby="client-tab-overview" className="space-y-3">
            {/* UserStatus snapshot — Spec 03 Sekcija 6.3 (Client Profile Status panel) */}
            {id && (
              <motion.div {...fadeUp(0.03)}>
                <ClientUserStatusPanel clientId={id} />
              </motion.div>
            )}

            {/* Quick stats — only show real data; mock Body Fat removed (V3 anti-bloat). */}
            <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 gap-3">
              {[
                client.weight > 0 ? { label: t("clientDetail.weight"), value: `${client.weight}`, unit: 'kg', trend: '', positive: true, color: 'text-foreground' } : null,
                { label: t("progress.workouts"), value: String(client.totalWorkoutsCompleted), unit: '', trend: '', positive: true, color: 'text-warning' },
                { label: t("progress.streak"), value: String(client.streak), unit: t("clients.statDaysUnit"), trend: '', positive: true, color: 'text-primary', hasFlame: true },
              ].filter((s): s is NonNullable<typeof s> => s !== null).map(s => (
                <Card key={s.label} className="p-4">
                  <div className="flex items-baseline gap-1">
                    <p className={`text-title-2 font-bold ${s.color}`}>{s.value}</p>
                    {s.unit && <span className="text-caption-1 text-muted-foreground/60 font-medium">{s.unit}</span>}
                    {s.hasFlame && <Flame size={16} className="text-warning ml-0.5" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-caption-1 text-muted-foreground">{s.label}</p>
                    {s.trend && <span className="text-caption-2 font-semibold text-success">{s.trend}</span>}
                  </div>
                </Card>
              ))}
            </motion.div>

            {/* Assigned programs */}
            <MotionCard {...fadeUp(0.1)} className="p-4">
              <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.assignedPrograms")}</h3>
              <button onClick={() => setActiveTab('training')} className="w-full flex items-center gap-4 text-left mb-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <Dumbbell size={ICON_SIZE.md} className="text-warning" />
                </div>
                <div className="flex-1">
                  <p className="text-body font-semibold text-foreground">
                    {assignedProgram?.name ?? t("clients.noProgramAssigned") ?? "No program assigned"}
                  </p>
                  <p className="text-caption-1 text-muted-foreground">
                    {assignedProgram
                      ? `${assignedProgram.workoutDays.length} ${t("training.daysLabel") ?? "days"} · ${assignedProgram.type}`
                      : t("clients.assignProgramHint") ?? "Assign a program from Training tab"}
                  </p>
                </div>
                <ChevronRight size={ICON_SIZE.xs} className="text-muted-foreground/30" />
              </button>
              <div className="border-t border-border pt-3">
                <button onClick={() => setActiveTab('nutrition')} className="w-full flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <UtensilsCrossed size={ICON_SIZE.md} className="text-success" />
                  </div>
                  <div className="flex-1">
                    {clientStatus?.nutrition ? (
                      <>
                        <p className="text-body font-semibold text-foreground">
                          {clientStatus.nutrition.targetMode === 'deficit'
                            ? t("nutrition.cut") ?? "Cut"
                            : clientStatus.nutrition.targetMode === 'lean_bulk'
                              ? t("nutrition.bulk") ?? "Bulk"
                              : t("nutrition.maintain") ?? "Maintain"}
                        </p>
                        <p className="text-caption-1 text-muted-foreground tabular-nums">
                          {clientStatus.nutrition.currentCalorieTarget} kcal · P:{clientStatus.nutrition.macros.proteinG}g C:{clientStatus.nutrition.macros.carbsG}g F:{clientStatus.nutrition.macros.fatG}g
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-body font-semibold text-foreground">{t("clients.noNutritionData") ?? "No nutrition data"}</p>
                        <p className="text-caption-1 text-muted-foreground">—</p>
                      </>
                    )}
                  </div>
                  <ChevronRight size={ICON_SIZE.xs} className="text-muted-foreground/30" />
                </button>
              </div>
            </MotionCard>

            {/* Activity log */}
            <MotionCard {...fadeUp(0.15)} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">{t("clients.activityLog")}</h3>
                <button className="text-primary text-caption-1 font-semibold">{t("clients.viewAll")}</button>
              </div>
              <div className="space-y-2.5">
                {activities.slice(0, 5).map((a, i) => {
                  const iconConfig = ACTIVITY_ICONS[a.icon] || ACTIVITY_ICONS['✅'];
                  const IconComp = iconConfig.icon;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${iconConfig.bg} flex items-center justify-center shrink-0`}>
                        <IconComp size={ICON_SIZE.xs} className={iconConfig.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-footnote text-foreground">{a.description}</p>
                      </div>
                      <span className="text-caption-2 text-muted-foreground/60 shrink-0">{a.time}</span>
                    </div>
                  );
                })}
                {activities.length === 0 && <p className="text-caption-1 text-muted-foreground">{t("clients.noRecentActivity")}</p>}
              </div>
            </MotionCard>

            {/* Notes */}
            <MotionCard {...fadeUp(0.2)} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">{t("clients.notes")}</h3>
                <button onClick={() => setShowNoteInput(true)} className="text-primary text-caption-1 font-semibold">+ {t("clients.addNote")}</button>
              </div>
              {showNoteInput && (
                <div className="mb-3 space-y-2">
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder={t("clients.addNote") + "..."}
                    className="w-full bg-muted/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl px-3 py-3 text-footnote min-h-[60px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddNote} variant="cta" size="sm" className="rounded-xl">{t("common.save")}</Button>
                    <button onClick={() => { setShowNoteInput(false); setNewNote(''); }} className="text-muted-foreground text-caption-1 px-4 py-2">{t("common.cancel")}</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {notes.map(n => (
                  <div key={n.id} className="bg-muted/30 rounded-xl px-3.5 py-3 group">
                    <p className="text-footnote text-foreground leading-relaxed">{n.body}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-caption-2 text-muted-foreground/60">
                        — {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                      <button
                        onClick={() => handleDeleteNote({ id: n.id, body: n.body })}
                        className="text-caption-2 text-muted-foreground/60 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                        aria-label={t("clients.notes.deleteAria")}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && !showNoteInput && <p className="text-caption-1 text-muted-foreground">{t("clients.noNotesYet")}</p>}
              </div>
            </MotionCard>

            {/* Health & Lifestyle — Grouped */}
            <motion.div {...fadeUp(0.25)} className="space-y-3">
              {/* Physical */}
              <Card className="p-4">
                <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.sections.physical")}</h3>
                {[
                  { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: t("clientDetail.injuries"), value: client.injuries || 'None' },
                  { icon: Brain, color: "text-secondary", bg: "bg-secondary/10", label: 'Metabolic', value: client.metabolicProfile.join(', ') || 'None' },
                  { icon: Moon, color: "text-info", bg: "bg-info/10", label: 'Sleep', value: `${client.sleepQuality}/10` },
                  { icon: Frown, color: "text-warning", bg: "bg-warning/10", label: 'Stress', value: `${client.stressLevel}/10` },
                ].map(({ icon: Icon, color, bg, label, value }, i, arr) => (
                  <div key={label}>
                    <div className="flex items-center gap-3 py-2">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={ICON_SIZE.xs} className={color} />
                      </div>
                      <div className="flex-1">
                        <p className="text-caption-2 text-muted-foreground/60">{label}</p>
                        <p className="text-footnote font-medium text-foreground">{value}</p>
                      </div>
                    </div>
                    {i < arr.length - 1 && <div className="border-b border-border/50 ml-11" />}
                  </div>
                ))}
              </Card>

              {/* Dietary */}
              <Card className="p-4">
                <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.sections.dietary")}</h3>
                {[
                  { icon: Ban, color: "text-destructive", bg: "bg-destructive/10", label: t("clientDetail.allergies"), value: client.allergies.length > 0 ? client.allergies.join(', ') : 'None' },
                  { icon: Cake, color: "text-muted-foreground", bg: "bg-muted", label: t("clientDetail.foodDislikes"), value: client.foodDislikes.length > 0 ? client.foodDislikes.join(', ') : 'None' },
                ].map(({ icon: Icon, color, bg, label, value }, i, arr) => (
                  <div key={label}>
                    <div className="flex items-center gap-3 py-2">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={ICON_SIZE.xs} className={color} />
                      </div>
                      <div className="flex-1">
                        <p className="text-caption-2 text-muted-foreground/60">{label}</p>
                        <p className="text-footnote font-medium text-foreground">{value}</p>
                      </div>
                    </div>
                    {i < arr.length - 1 && <div className="border-b border-border/50 ml-11" />}
                  </div>
                ))}
              </Card>

              {/* Lifestyle */}
              <Card className="p-4">
                <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.sections.lifestyle")}</h3>
                {[
                  { icon: Briefcase, color: "text-info", bg: "bg-info/10", label: t("clientDetail.jobType"), value: client.jobType },
                  { icon: Clock, color: "text-success", bg: "bg-success/10", label: t("clientDetail.workSchedule"), value: client.workSchedule },
                ].map(({ icon: Icon, color, bg, label, value }, i, arr) => (
                  <div key={label}>
                    <div className="flex items-center gap-3 py-2">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={ICON_SIZE.xs} className={color} />
                      </div>
                      <div className="flex-1">
                        <p className="text-caption-2 text-muted-foreground/60">{label}</p>
                        <p className="text-footnote font-medium text-foreground">{value}</p>
                      </div>
                    </div>
                    {i < arr.length - 1 && <div className="border-b border-border/50 ml-11" />}
                  </div>
                ))}
                <button onClick={() => setActiveTab('settings')} className="text-primary text-caption-1 font-semibold mt-3 flex items-center gap-1 ml-11 min-h-11">
                  {t("clients.editInSettings")} <ChevronRight size={16} />
                </button>
              </Card>
            </motion.div>
          </div>
        )}

        {activeTab === 'training' && (
          <div role="tabpanel" id="client-panel-training" aria-labelledby="client-tab-training" className="space-y-3">
            <MotionCard {...fadeUp(0.05)} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Dumbbell size={ICON_SIZE.md} className="text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="text-body font-semibold text-foreground">
                    {assignedProgram?.name ?? t("clients.noProgramAssigned")}
                  </h3>
                  <p className="text-caption-1 text-muted-foreground">{t("clients.weekOf")} {client.programWeek} {t("clients.of")} {client.programTotalWeeks}</p>
                </div>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((client.programWeek / client.programTotalWeeks) * 100)}%` }}
                  transition={{ duration: MOTION_DURATION.xSlow }}
                  className="h-full rounded-full gradient-primary"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-caption-2 text-muted-foreground tabular-nums">{Math.round((client.programWeek / client.programTotalWeeks) * 100)}% {t("clients.complete")}</p>
                <button className="text-primary text-caption-1 font-semibold">{t("clients.changeProgram")}</button>
              </div>
            </MotionCard>

            <MotionCard {...fadeUp(0.1)} className="p-4">
              <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.thisWeek")}</h3>
              <p className="text-caption-1 text-muted-foreground py-3">
                {t("clients.weekScheduleEmpty")}
              </p>
            </MotionCard>

            <MotionCard {...fadeUp(0.15)} className="p-4">
              <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.workoutHistory")}</h3>
              <p className="text-caption-1 text-muted-foreground py-3">
                {t("clients.workoutHistoryEmpty")}
              </p>
            </MotionCard>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div role="tabpanel" id="client-panel-nutrition" aria-labelledby="client-tab-nutrition">
            <ClientNutritionPlan client={client} />
          </div>
        )}

        {activeTab === 'checkins' && (
          <div role="tabpanel" id="client-panel-checkins" aria-labelledby="client-tab-checkins" className="space-y-3">
            {/* History — empty state until weekly_check_ins integration */}
            <MotionCard {...fadeUp(0.05)} className="p-4">
              <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.history")}</h3>
              <p className="text-caption-1 text-muted-foreground py-3">
                {t("clients.checkInsEmpty")}
              </p>
            </MotionCard>

            {/* Progress photos */}
            <MotionCard {...fadeUp(0.15)} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">{t("clients.progressPhotos")}</h3>
                <button className="text-primary text-caption-1 font-semibold">{t("clients.viewAll")}</button>
              </div>
              <p className="text-caption-1 text-muted-foreground py-3">
                {t("clients.photosEmpty")}
              </p>
              <button className="text-primary text-caption-1 font-semibold mt-3 flex items-center gap-1 min-h-11 px-1">
                <Camera size={16} /> {t("clients.uploadPhoto")}
              </button>
            </MotionCard>

            {/* Metrics */}
            <MotionCard {...fadeUp(0.2)} className="p-4">
              <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.metrics")}</h3>
              {[
                client.weight > 0 ? { label: t("clientDetail.weight"), value: `${client.weight} kg`, color: 'text-foreground' } : null,
              ].filter(Boolean).map((m, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-footnote font-medium text-foreground">{m!.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-caption-1 font-bold ${m!.color}`}>{m!.value}</span>
                    </div>
                  </div>
                  <button className="text-primary text-caption-1 font-semibold min-h-11 px-2">{t("clients.viewGraph")}</button>
                </div>
              ))}
              <button className="text-primary text-caption-1 font-semibold mt-3 flex items-center gap-1 min-h-11 px-1">
                <Activity size={16} /> {t("clients.logMetric")}
              </button>
            </MotionCard>
          </div>
        )}

        {activeTab === 'settings' && (
          <div role="tabpanel" id="client-panel-settings" aria-labelledby="client-tab-settings" className="space-y-3">
            {/* Profile info */}
            <MotionCard {...fadeUp(0.05)} className="p-4">
              <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.profileInfo")}</h3>
              {[
                { label: t("addClient.name"), value: client.name },
                { label: t("addClient.email"), value: client.email },
                { label: t("clientDetail.goals"), value: client.goals.join(', ') },
                { label: t("clientDetail.injuries"), value: client.injuries },
                { label: t("clientDetail.allergies"), value: client.allergies.join(', ') || 'None' },
                { label: t("clientDetail.foodDislikes"), value: client.foodDislikes.join(', ') || 'None' },
                { label: t("clientDetail.jobType"), value: client.jobType },
                { label: t("clientDetail.workSchedule"), value: client.workSchedule },
              ].map((f, i) => (
                <div key={i} className="py-2.5 border-b border-border/50 last:border-0">
                  <p className="text-caption-2 text-muted-foreground/60">{f.label}</p>
                  <p className="text-footnote font-medium text-foreground mt-0.5">{f.value}</p>
                </div>
              ))}
            </MotionCard>

            {/* Program settings */}
            <MotionCard {...fadeUp(0.1)} className="p-4">
              <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("clients.programSettings")}</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-caption-2 text-muted-foreground/60 mb-1.5">{t("clients.fieldType")}</p>
                  <div className="flex gap-2">
                    {(['online', 'in_person', 'hybrid'] as const).map(tp => (
                      <span key={tp} className={`px-3.5 py-2 rounded-xl text-caption-1 font-semibold transition-all ${
                        client.type === tp ? 'gradient-primary text-primary-foreground shadow-fab' : 'bg-muted/50 text-muted-foreground border border-border'
                      }`}>
                        {tp === 'online' ? t("clients.online") : tp === 'in_person' ? t("clients.inPerson") : t("clients.hybrid")}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-caption-2 text-muted-foreground/60 mb-1.5">{t("clients.fieldStatus")}</p>
                  <div className="flex gap-2">
                    {(['active', 'paused', 'finished'] as const).map(st => (
                      <span key={st} className={`px-3.5 py-2 rounded-xl text-caption-1 font-semibold transition-all ${
                        client.status === st ? 'gradient-primary text-primary-foreground shadow-fab' : 'bg-muted/50 text-muted-foreground border border-border'
                      }`}>
                        {st === 'active' ? t("clients.active") : st === 'paused' ? t("clients.paused") : t("clients.finished")}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-caption-2 text-muted-foreground/60">{t("clients.fieldDuration")}</p>
                  <p className="text-footnote font-medium text-foreground mt-0.5">
                    {t("clients.weeks").replace("{n}", String(client.programTotalWeeks))}
                  </p>
                </div>
              </div>
            </MotionCard>

            {/* Sync Rules Override — IT-18 */}
            {id && (
              <motion.div {...fadeUp(0.12)}>
                <SyncRulesOverrideSection clientId={id} />
              </motion.div>
            )}

            {/* Equipment — V3 §10 */}
            {id && (
              <MotionCard {...fadeUp(0.13)} className="p-4">
                <EquipmentEditor clientId={id} />
              </MotionCard>
            )}

            {/* Pause client — V3 §10 (Saved client = saved revenue) */}
            {id && (
              <MotionCard {...fadeUp(0.16)} className="p-4">
                <PauseClientCard clientId={id} />
              </MotionCard>
            )}

            {/* Danger zone */}
            <motion.div {...fadeUp(0.2)} className="mt-6 space-y-3">
              <h3 className="text-caption-1 font-semibold text-muted-foreground uppercase tracking-wider">{t("clients.dangerZone")}</h3>
              <button className="w-full bg-card rounded-2xl p-4 card-shadow text-left border border-warning/20">
                <p className="text-body text-warning font-semibold">{t("clients.archive")}</p>
              </button>
              <button className="w-full bg-card rounded-2xl p-4 card-shadow text-left border border-destructive/20">
                <p className="text-body text-destructive font-semibold">{t("clients.deleteClient")}</p>
                <p className="text-caption-1 text-muted-foreground mt-0.5">{t("clients.deleteConfirm")}</p>
              </button>
            </motion.div>
          </div>
        )}
      </div>

      {id && (
        <TierPromoteSheet
          open={showTierSheet}
          onOpenChange={setShowTierSheet}
          clientId={id}
          currentTier={clientTier}
          onPromoted={(t) => setClientTier(t)}
        />
      )}
    </div>
  );
};

export default ClientProfile;
