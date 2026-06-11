import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { ChevronRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { useTrainerClients } from "@/hooks/useTrainerClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClientTier, useTrainerClientCard } from "@/hooks/useProfile";
import { useClientActivity } from "@/hooks/useClientActivity";
import { useClientNotes, useCreateClientNote, useDeleteClientNote } from "@/hooks/useClientNotes";
import { useUndoableAction } from "@/hooks/useUndoableAction";
import { useUserStatus } from "@/hooks/useUserStatus";
import { useProgram } from "@/hooks/usePrograms";
import { useQuery } from "@tanstack/react-query";
import { listProgramAssignmentsForClient } from "@/services/programService";
import ClientNutritionPlan from "@/components/trainer/ClientNutritionPlan";
import { PageHeader } from "@/components/PageHeader";
import TierPromoteSheet from "@/components/trainer/TierPromoteSheet";
import type { PackageTier } from "@/services/packageService";
import { TabControl } from "@/components/ui/tab-control";
// Dekompozicija — sekcije izdvojene u sibling fajlove (pattern: ProgramEditorParts.tsx)
import {
  TABS,
  type Tab,
  ClientProfileHero,
  ClientProfileTrainingTab,
  ClientProfileCheckinsTab,
  ClientProfileSettingsTab,
} from "./ClientProfileParts";
import { ClientProfileOverviewTab } from "./ClientProfileOverviewTab";

const ClientProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Prev/next client navigation — Quick Win #14 (TrueCoach parity)
  const { clients: trainerClients } = useTrainerClients();
  // BUG fix (strict): ClientListItem ima `clientId`, ne `id` — staro `c.id`
  // je uvek bilo undefined pa prev/next navigacija nikad nije radila.
  const currentIdx = trainerClients.findIndex((c) => c.clientId === id);
  const prevClientId = currentIdx > 0 ? trainerClients[currentIdx - 1].clientId : null;
  const nextClientId =
    currentIdx >= 0 && currentIdx < trainerClients.length - 1
      ? trainerClients[currentIdx + 1].clientId
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

      {/* Premium Client Header — gradient hero (izdvojen u ClientProfileParts) */}
      <ClientProfileHero
        client={client}
        clientTier={clientTier}
        onOpenTierSheet={() => setShowTierSheet(true)}
      />

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
          <ClientProfileOverviewTab
            id={id}
            client={client}
            activities={activities}
            clientStatus={clientStatus}
            assignedProgram={assignedProgram}
            notes={notes}
            newNote={newNote}
            setNewNote={setNewNote}
            showNoteInput={showNoteInput}
            setShowNoteInput={setShowNoteInput}
            handleAddNote={handleAddNote}
            handleDeleteNote={handleDeleteNote}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'training' && (
          <ClientProfileTrainingTab client={client} assignedProgram={assignedProgram} />
        )}

        {activeTab === 'nutrition' && (
          <div role="tabpanel" id="client-panel-nutrition" aria-labelledby="client-tab-nutrition">
            <ClientNutritionPlan client={client} />
          </div>
        )}

        {activeTab === 'checkins' && (
          <ClientProfileCheckinsTab client={client} />
        )}

        {activeTab === 'settings' && (
          <ClientProfileSettingsTab id={id} client={client} />
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
