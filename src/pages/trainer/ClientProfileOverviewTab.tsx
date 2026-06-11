// Overview tab ClientProfile stranice — status panel, quick stats, dodeljeni programi,
// activity log, beleške i health/lifestyle sekcije. Verbatim JSX iz ClientProfile.tsx.
import { Button } from "@/components/ui/button";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { Flame, ChevronRight, Dumbbell, UtensilsCrossed, AlertTriangle, Ban, Cake, Briefcase, Clock, Brain, Moon, Frown, CheckCircle2, MessageSquare, Camera, Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ClientData } from "@/data/trainerMockData";
import type { ActivityEntry } from "@/hooks/useClientActivity";
import type { ClientNoteRecord } from "@/hooks/useClientNotes";
import type { UserStatus } from "@/types/userStatus";
import type { ProgramRecord } from "@/services/programService";
import { ClientUserStatusPanel } from "@/components/queue/ClientUserStatusPanel";
import { Card } from "@/components/ui/card";
import { MotionCard } from "@/components/ui/motion-card";
import type { Tab } from "./ClientProfileParts";

const ACTIVITY_ICONS: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  '✅': { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  '📝': { icon: MessageSquare, color: 'text-info', bg: 'bg-info/10' },
  '🥗': { icon: UtensilsCrossed, color: 'text-success', bg: 'bg-success/10' },
  '📸': { icon: Camera, color: 'text-secondary', bg: 'bg-secondary/10' },
  '💪': { icon: Activity, color: 'text-warning', bg: 'bg-warning/10' },
};

interface ClientProfileOverviewTabProps {
  id: string | undefined;
  client: ClientData;
  activities: ActivityEntry[];
  clientStatus: UserStatus | null;
  assignedProgram: ProgramRecord | null | undefined;
  notes: ClientNoteRecord[];
  newNote: string;
  setNewNote: (v: string) => void;
  showNoteInput: boolean;
  setShowNoteInput: (v: boolean) => void;
  handleAddNote: () => void;
  handleDeleteNote: (note: { id: string; body: string }) => void;
  setActiveTab: (tab: Tab) => void;
}

export const ClientProfileOverviewTab = ({
  id,
  client,
  activities,
  clientStatus,
  assignedProgram,
  notes,
  newNote,
  setNewNote,
  showNoteInput,
  setShowNoteInput,
  handleAddNote,
  handleDeleteNote,
  setActiveTab,
}: ClientProfileOverviewTabProps) => {
  const { t } = useLanguage();

  return (
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
  );
};
