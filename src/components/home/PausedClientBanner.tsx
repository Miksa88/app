// ============================================================================
// PausedClientBanner — vidljiv klijentu kad je plan pauziran
// V3 §10 + MVP_PRESET gap #1 (Pause/Freeze)
// ============================================================================
//
// Prikazuje i trener-pauzu i klijent-pauzu (obe zive u profiles.pause_state;
// start-pause EF mirror-uje klijent-pauzu tamo). Ako je pause_until istekao,
// useAutoEndExpiredPause automatski završava pauzu (end-pause EF / resume)
// i banner nestaje — klijentkinja ne mora ništa da klikne.
// ============================================================================

import { Snowflake } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useClientPause } from "@/hooks/useClientPause";
import { useAutoEndExpiredPause } from "@/hooks/useAutoEndExpiredPause";
import { isPauseExpired } from "@/services/clientPauseService";

const PausedClientBanner = () => {
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const { data: pauseState } = useClientPause(clientId);

  // Auto-end istekle pauze (fire-and-forget; invalidira cache kad završi)
  useAutoEndExpiredPause(clientId, pauseState ?? null);

  if (!pauseState) return null;
  // Istekla pauza: ne prikazuj banner dok auto-end radi svoje
  if (isPauseExpired(pauseState)) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl bg-warning/10 border border-warning/30 p-4 flex items-start gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
        <Snowflake size={20} className="text-warning" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-headline font-semibold text-foreground">
          {t("home.paused.title")}
        </p>
        <p className="text-footnote text-muted-foreground">
          {pauseState.pause_until
            ? t("home.paused.untilDate").replace("{date}", pauseState.pause_until)
            : t("home.paused.indefinite")}
        </p>
        {pauseState.reason && (
          <p className="text-caption-1 text-muted-foreground italic mt-1">
            {pauseState.reason}
          </p>
        )}
      </div>
    </div>
  );
};

export default PausedClientBanner;
