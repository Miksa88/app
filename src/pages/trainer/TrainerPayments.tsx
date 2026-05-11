import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { CreditCard, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTitle } from "@/components/PageTitle";
import { useLanguage } from "@/contexts/LanguageContext";

// TODO: integracija sa Stripe + payments tabelom u IT-25.
// Beta: nemamo billing backend, prikazujemo empty state da trener
// ne dobija lažne podatke o aktivnim pretplatama.

const TrainerPayments = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageHeader onBack={() => navigate(-1)} backLabel={t("nav.trainerHome")} />

      <PageTitle title={t("payments.title")} compact />

      <motion.div {...fadeUp(0.05)} className="px-5 pt-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <CreditCard size={32} className="text-primary" aria-hidden="true" />
        </div>
        <h2 className="text-title-2 font-bold text-foreground mb-2">{t("payments.emptyTitle")}</h2>
        <p className="text-body text-muted-foreground max-w-xs mb-6">{t("payments.emptyBody")}</p>
        <motion.button
          whileTap={{ scale: TAP_SCALE.primary }}
          onClick={() => navigate("/trainer/messages")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground text-body font-semibold min-h-12"
        >
          <MessageCircle size={18} aria-hidden="true" />
          {t("payments.contactClients")}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default TrainerPayments;
