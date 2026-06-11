import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useLanguage } from "@/contexts/LanguageContext";
import { SectionLabel } from "@/components/ui/section-label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Pretplata — sub-page izdvojen iz Profile.tsx (verbatim JSX)
// TODO: zameniti pravim subscription query-jem (Stripe / Supabase) u IT-25.
// Za beta — niko nema aktivnu pretplatu, "Manage" ulazi u plan landing.
const subscriptionFeatures = [
  "sub.personalizedPlan", "sub.allExercises", "sub.progressTracking",
  "sub.mealPlan", "sub.trainerChat", "sub.weeklyCheckin", "sub.monthlyVideo",
];

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-title-2 text-foreground mb-2">{t("subscription.title")}</h2>
      <p className="text-subhead text-muted-foreground mb-6">{t("subscription.subtitle")}</p>
      <Card className="p-5 mb-4">
        <SectionLabel className="!px-0">{t("subscription.included")}</SectionLabel>
        <div className="space-y-3">
          {subscriptionFeatures.map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center shrink-0">
                <Check size={ICON_SIZE.xs} className="text-primary-foreground" />
              </div>
              <span className="text-body text-foreground">{t(f)}</span>
            </div>
          ))}
        </div>
      </Card>
      <Button onClick={() => navigate("/subscription")} variant="cta" size="xl">
        {t("subscription.changePlan")}
      </Button>
      <Button variant="link" className="w-full text-destructive mt-2 min-h-11 hover:no-underline">{t("subscription.cancel")}</Button>
    </motion.div>
  );
};

export default SubscriptionPage;
