// ============================================================================
// PromoteBanner — klijent dobija ponudu da pređe na intermediate kad pogodi
// top of rep range u 8+ uzastopnih sesija (Faza E full)
// ============================================================================

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Sparkles, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { checkClientPromoteSignal } from "@/services/autoPilotService";
import { toast } from "sonner";

interface Props {
  delay?: number;
}

const STORAGE_KEY_DISMISSED = "fbi:promote_dismissed";

const PromoteBanner = ({ delay = 0 }: Props) => {
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const [show, setShow] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_DISMISSED) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!clientId || dismissed) return;
    let cancelled = false;
    void (async () => {
      // Pull current experience iz profila
      const { data } = await supabase
        .from("profiles")
        .select("experience_level")
        .eq("id", clientId)
        .maybeSingle();
      if (cancelled || !data?.experience_level || data.experience_level !== "beginner") return;

      const verdict = await checkClientPromoteSignal(clientId, "beginner");
      if (!cancelled && verdict.kind === "promote") {
        setShow(true);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, dismissed]);

  const handleAccept = async () => {
    if (!clientId) return;
    setAccepting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ experience_level: "intermediate" })
        .eq("id", clientId);
      if (error) throw error;
      toast.success(t("promote.confirm"));
      setShow(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setAccepting(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div {...fadeUp(delay)}>
          <div className="rounded-2xl p-4 gradient-primary text-primary-foreground shadow-fab relative overflow-hidden">
            <button
              onClick={handleDismiss}
              aria-label={t("mealPlan.cancel")}
              className="absolute top-2 right-2 text-primary-foreground/70 min-w-9 min-h-9 flex items-center justify-center"
            >
              <X size={16} aria-hidden="true" />
            </button>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles size={18} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="text-headline font-bold">{t("promote.title")}</p>
                <p className="text-caption-1 opacity-90 mt-0.5">{t("promote.body")}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: TAP_SCALE.primary }}
              onClick={handleAccept}
              disabled={accepting}
              className="w-full bg-white/20 backdrop-blur-sm rounded-xl py-3 text-body font-semibold flex items-center justify-center gap-2 min-h-12 disabled:opacity-50"
            >
              <Check size={16} aria-hidden="true" />
              {accepting ? "..." : t("promote.cta")}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PromoteBanner;
