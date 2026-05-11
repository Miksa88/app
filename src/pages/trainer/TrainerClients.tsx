import { useState } from "react";
import { NavSearchBar } from "@/components/ui/nav-search-bar";
import { NavPlusButton } from "@/components/ui/nav-plus-button";
import { PageTitle } from "@/components/PageTitle";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Search, ChevronRight, Users, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { useTrainerClients } from "@/hooks/useTrainerClients";
import type { ClientListItem } from "@/services/trainerService";

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function displayName(c: ClientListItem): string {
  const full = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  return c.email?.split("@")[0] ?? "Client";
}

const TrainerClients = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clients, isLoading } = useTrainerClients();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "at_risk">("all");

  const filteredBySearch = clients.filter(c => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      displayName(c).toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });
  const filtered = activeFilter === "at_risk"
    ? filteredBySearch.filter(c => c.isAtRisk)
    : filteredBySearch;

  const filters = [
    { key: "all" as const, label: t("clients.all"), count: clients.length },
    { key: "at_risk" as const, label: t("clients.atRisk"), count: clients.filter(c => c.isAtRisk).length },
  ];

  const ClientRow = ({ client }: { client: ClientListItem }) => (
    <motion.button
      whileTap={{ scale: TAP_SCALE.secondary }}
      onClick={() => navigate(`/trainer/client/${client.clientId}`)}
      className="w-full bg-card rounded-2xl p-4 card-shadow flex items-center gap-4 text-left"
    >
      <UserAvatar
        name={displayName(client)}
        imageUrl={client.avatarUrl ?? undefined}
        size="md"
        status={client.isAtRisk ? "trial" : "active"}
        layoutId={`client-avatar-${client.clientId}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-foreground truncate">{displayName(client)}</p>
        {client.email && (
          <p className="text-caption-1 text-muted-foreground truncate mt-0.5">{client.email}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {client.isAtRisk && (
            <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex items-center gap-1">
              <AlertTriangle size={12} aria-hidden="true" /> {t("clients.atRisk")}
            </span>
          )}
          {client.isInDeload && (
            <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-info/10 text-info">
              Deload
            </span>
          )}
          {client.cyclePhase && (
            <span className="text-caption-2 font-semibold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
              {client.cyclePhase}
            </span>
          )}
          <span className="text-caption-2 text-muted-foreground/70">
            {getRelativeTime(client.lastUpdatedAt)}
          </span>
        </div>
      </div>
      <ChevronRight size={16} className="text-muted-foreground/30 shrink-0" />
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageTitle
        title={t("clients.title")}
        action={
          <NavPlusButton
            onClick={() => navigate("/trainer/client/add")}
            aria-label={t("clients.addClient")}
          />
        }
      />
      <div className="px-5 pb-2 bg-background-secondary">
        <motion.div {...fadeUp(0.05)} className="mb-4">
          <NavSearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("clients.search")}
          />
        </motion.div>

        <motion.div {...fadeUp(0.1)} className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 rounded-full text-caption-1 font-semibold whitespace-nowrap transition-all min-h-11 ${
                activeFilter === f.key
                  ? "gradient-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border"
              }`}
            >
              {f.label}{f.count > 0 ? ` (${f.count})` : ""}
            </button>
          ))}
        </motion.div>
      </div>

      <div className="px-5 mt-3">
        {isLoading ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
            <p className="text-caption-1 text-muted-foreground mt-3">{t("common.loading")}</p>
          </div>
        ) : clients.length === 0 ? (
          <motion.div {...fadeUp(0.15)} className="flex flex-col items-center text-center pt-12">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users size={32} className="text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-title-2 font-bold text-foreground mb-2">{t("clients.emptyTitle")}</h2>
            <p className="text-body text-muted-foreground max-w-xs mb-6">{t("clients.emptyBody")}</p>
            <Button onClick={() => navigate("/trainer/client/add")} variant="cta" size="xl">
              {t("clients.addClient")}
            </Button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Search size={ICON_SIZE.lg} className="text-muted-foreground/50" aria-hidden="true" />
            </div>
            <p className="text-body text-muted-foreground">{t("clients.search")}…</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((client, i) => (
              <motion.div key={client.clientId} {...fadeUp(0.1 + i * 0.03)}>
                <ClientRow client={client} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerClients;
