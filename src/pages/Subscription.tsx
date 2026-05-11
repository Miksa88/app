import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Crown, MessageCircle, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PageTitle } from "@/components/PageTitle";
import { MotionButton } from "@/components/ui/motion-button";
import { useLanguage } from "@/contexts/LanguageContext";

// TODO: integrisati sa Stripe / RevenueCat backend-om u IT-25.
// Beta verzija: pretplate nisu aktivne, korisnici prelaze na /chat za upit.
const Subscription = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background-secondary pb-12">
      <PageHeader onBack={() => navigate(-1)} backLabel={t("profile.title")} />

      <PageTitle
        title={t("subscription.chooseYourPlan")}
        subtitle={t("subscription.comingSoonBody")}
        compact
      />
      <div className="px-5 pt-3">

        <motion.div
          {...fadeUp(0.08)}
          className="rounded-2xl p-6 mb-4 bg-card card-shadow border-2 border-primary/30 relative overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles size={24} className="text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-title-3 font-bold text-foreground">{t("subscription.betaTitle")}</h2>
              <p className="text-caption-1 text-muted-foreground">{t("subscription.betaTagline")}</p>
            </div>
          </div>

          <p className="text-body text-foreground mb-5 leading-relaxed">
            {t("subscription.betaDescription")}
          </p>

          <MotionButton
            onClick={() => navigate("/chat")}
            variant="cta"
            size="xl"
          >
            <MessageCircle size={18} aria-hidden="true" />
            {t("subscription.contactTrainer")}
          </MotionButton>
        </motion.div>

        <motion.div {...fadeUp(0.16)} className="mt-4">
          <div className="rounded-2xl p-6 card-shadow bg-gradient-to-br from-amber-500/5 to-amber-600/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={20} className="text-amber-500" aria-hidden="true" />
              <h2 className="text-title-3 font-bold text-foreground">{t("subscription.vipTitle")}</h2>
            </div>
            <p className="text-subhead text-muted-foreground">{t("subscription.vipDesc")}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Subscription;
