// ============================================================================
// AutoPilotFeed — agregira plateau alerts + missing video signal za trener
// Spec: roadmap Faza E
// ============================================================================

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { TrendingDown, Video, AlertTriangle, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getTrainerPlateauAlerts,
  getMissingVideoSignal,
  type PlateauAlert,
} from "@/services/autoPilotService";

interface Props {
  delay?: number;
}

const AutoPilotFeed = ({ delay = 0 }: Props) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [plateauAlerts, setPlateauAlerts] = useState<PlateauAlert[]>([]);
  const [missingVideos, setMissingVideos] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [pA, mv] = await Promise.all([
          getTrainerPlateauAlerts(),
          getMissingVideoSignal(),
        ]);
        if (cancelled) return;
        setPlateauAlerts(pA);
        setMissingVideos(mv.exercises.slice(0, 5).map(e => ({ id: e.id, name: e.name })));
      } catch {
        // Silent failure — auto-pilot je nice-to-have
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;
  if (plateauAlerts.length === 0 && missingVideos.length === 0) return null;

  return (
    <motion.div {...fadeUp(delay)} className="space-y-3">
      {plateauAlerts.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-warning/5 border-b border-warning/20 flex items-center gap-2">
            <TrendingDown size={16} className="text-warning" aria-hidden="true" />
            <p className="text-callout font-semibold text-foreground">
              {plateauAlerts.length} {t("plateau.title")}
            </p>
          </div>
          <div>
            {plateauAlerts.slice(0, 3).map((alert) => {
              const fullName = [alert.firstName, alert.lastName].filter(Boolean).join(" ").trim() || "—";
              return (
                <motion.button
                  key={alert.clientId}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => navigate(`/trainer/client/${alert.clientId}`)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left border-b border-border/50 last:border-0 min-h-14"
                >
                  <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                    <AlertTriangle size={14} className="text-warning" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-foreground truncate">{fullName}</p>
                    <p className="text-caption-1 text-muted-foreground truncate">
                      {alert.weeksObserved} {t("plateau.weeks")}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/40 shrink-0" aria-hidden="true" />
                </motion.button>
              );
            })}
          </div>
        </Card>
      )}

      {missingVideos.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 bg-info/5 border-b border-info/20 flex items-center gap-2">
            <Video size={16} className="text-info" aria-hidden="true" />
            <p className="text-callout font-semibold text-foreground">
              {missingVideos.length} {t("missingVideo.title")}
            </p>
          </div>
          <div>
            {missingVideos.map((ex) => (
              <motion.button
                key={ex.id}
                whileTap={{ scale: TAP_SCALE.secondary }}
                onClick={() => navigate(`/trainer/exercise/${ex.id}`)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left border-b border-border/50 last:border-0 min-h-14"
              >
                <div className="w-9 h-9 rounded-full bg-info/10 flex items-center justify-center shrink-0">
                  <Video size={14} className="text-info" aria-hidden="true" />
                </div>
                <p className="text-body text-foreground flex-1 truncate">{ex.name}</p>
                <ChevronRight size={14} className="text-muted-foreground/40 shrink-0" aria-hidden="true" />
              </motion.button>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
};

export default AutoPilotFeed;
