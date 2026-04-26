import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { MessageCircle, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// TODO: pravi messaging backend (messages tabela + Realtime channel) u IT-26.
// Beta: prikazujemo empty state da trener ne dobija lažne razgovore.

const TrainerMessages = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <div className="px-5 pt-14 pb-4 bg-background-secondary">
        <motion.h1 {...fadeUp()} className="text-large-title text-foreground">
          {t("trainerMsg.title")}
        </motion.h1>
      </div>

      <motion.div {...fadeUp(0.08)} className="px-5 pt-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <MessageCircle size={32} className="text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-title-2 font-bold text-foreground mb-2">{t("trainerMsg.emptyTitle")}</h2>
        <p className="text-body text-muted-foreground max-w-xs mb-6">{t("trainerMsg.emptyBody")}</p>
        <motion.button
          whileTap={{ scale: TAP_SCALE.primary }}
          onClick={() => navigate("/trainer/clients")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground text-body font-semibold min-h-12"
        >
          <Users size={18} aria-hidden="true" />
          {t("trainerMsg.viewClients")}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default TrainerMessages;
