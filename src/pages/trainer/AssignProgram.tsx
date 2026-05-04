import { useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useProgram, useAssignProgramToClients } from "@/hooks/usePrograms";
import { useTrainerClients } from "@/hooks/useTrainerClients";

const AssignProgram = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: program } = useProgram(id ?? null);
  const { clients } = useTrainerClients();
  const assignMutation = useAssignProgramToClients();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const clientNameOf = (c: { firstName: string | null; lastName: string | null; email: string | null }) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    c.email?.split("@")[0] ||
    "Client";

  const filtered = clients.filter((c) =>
    clientNameOf(c).toLowerCase().includes(search.toLowerCase()),
  );

  const toggleClient = (clientId: string) => {
    const next = new Set(selected);
    if (next.has(clientId)) next.delete(clientId);
    else next.add(clientId);
    setSelected(next);
  };

  const handleAssign = async () => {
    if (selected.size === 0 || !id) return;
    try {
      const result = await assignMutation.mutateAsync({
        programId: id,
        clientIds: Array.from(selected),
      });
      toast({
        title: t("training.programAssigned").replace("{count}", String(result.updated)),
      });
      if (result.missing.length > 0) {
        toast({
          title: `${result.missing.length} client(s) skipped — no template assignment yet`,
          variant: "destructive",
        });
      }
      navigate(-1);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Assignment failed",
        variant: "destructive",
      });
    }
  };

  if (!program) return null;

  return (
    <div className="min-h-screen bg-background-secondary pb-28">
      <PageHeader onBack={() => navigate(-1)} backLabel={t("training.title")} />

      {/* Static Large Title */}
      <div className="px-5 pt-2 pb-3">
        <h1 className="text-large-title text-foreground tracking-tight">{t("training.assignTo")}</h1>
        <p className="text-subhead text-muted-foreground mt-1">{program.name}</p>
      </div>

      <div className="px-5">

        {/* Search */}
        <motion.div {...fadeUp(0.05)} className="relative mb-4">
          <Search size={ICON_SIZE.md} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("trainer.searchClients")}
            className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-xl pl-10 pr-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/30 card-shadow"
          />
        </motion.div>

        {/* Client list */}
        <div className="space-y-2">
          {filtered.map((client, i) => {
            const isSelected = selected.has(client.clientId);
            const name = clientNameOf(client);
            return (
              <motion.button
                key={client.clientId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileTap={{ scale: TAP_SCALE.secondary }}
                onClick={() => toggleClient(client.clientId)}
                className={`w-full bg-card rounded-xl p-4 card-shadow flex items-center gap-3 text-left transition-all ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-body shrink-0">
                  {name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-foreground">{name}</p>
                  <p className="text-caption-1 text-muted-foreground">{client.email ?? ""}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom sticky */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-5 pb-8 max-w-lg mx-auto bg-background-secondary">
          <Button
            onClick={handleAssign}
            variant="cta"
            size="xl"
          >
            {t("training.assignToClients").replace("{count}", String(selected.size))}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AssignProgram;
