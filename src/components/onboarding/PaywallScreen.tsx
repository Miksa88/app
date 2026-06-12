import { useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from "framer-motion";
import { Check, ArrowLeft, Lock, Bell, Crown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MotionButton } from "@/components/ui/motion-button";

interface PaywallScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

const PaywallScreen = ({ onComplete, onBack }: PaywallScreenProps) => {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<string>("yearly");

  const plans = [
    {
      id: "monthly",
      label: t("paywall.monthly"),
      price: "9,99 €",
      perMonth: "/mo",
      badge: null,
    },
    {
      id: "yearly",
      label: t("paywall.yearly"),
      price: "2,91 €",
      perMonth: "/mo",
      badge: t("paywall.trialBadge"),
    },
  ];

  const timeline = [
    {
      icon: Lock,
      iconBg: "gradient-primary",
      title: t("paywall.timeline.today"),
      desc: t("paywall.timeline.todayDesc"),
      lineColor: "bg-primary",
    },
    {
      icon: Bell,
      iconBg: "gradient-primary opacity-80",
      title: t("paywall.timeline.reminder"),
      desc: t("paywall.timeline.reminderDesc"),
      lineColor: "bg-primary/40",
    },
    {
      icon: Crown,
      iconBg: "bg-muted-foreground/40",
      title: t("paywall.timeline.billing"),
      desc: t("paywall.timeline.billingDesc"),
      lineColor: "bg-muted",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col px-5 pt-14 pb-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-foreground min-w-11 min-h-11 flex items-center">
          <ArrowLeft size={24} />
        </button>
        <button className="text-subhead text-muted-foreground">
          {t("paywall.restore")}
        </button>
      </div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-title-1 font-bold text-foreground leading-tight tracking-tight mb-10"
      >
        {t("paywall.headline")}
      </motion.h1>

      {/* Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-auto"
      >
        {timeline.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex gap-4">
              {/* Icon + Line column */}
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full ${step.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon size={ICON_SIZE.md} className="text-primary-foreground" />
                </div>
                {i < timeline.length - 1 && (
                  <div className={`w-[3px] flex-1 my-1 rounded-full ${step.lineColor}`} />
                )}
              </div>
              {/* Text */}
              <div className={`pb-6 ${i === timeline.length - 1 ? "" : ""}`}>
                <p className="text-headline text-foreground leading-tight">
                  {step.title}
                </p>
                <p className="text-subhead text-muted-foreground mt-1 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Plan cards - side by side */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3 mb-4"
      >
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative rounded-2xl p-4 text-left transition active:scale-[0.97] ${
                isSelected
                  ? "border-2 border-primary bg-card"
                  : "border-2 border-border bg-card"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground text-caption-2 font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  {plan.badge}
                </span>
              )}
              <p className="text-subhead text-foreground font-medium mt-1">
                {plan.label}
              </p>
              <p className="text-headline font-bold text-foreground mt-1">
                {plan.price}
                <span className="text-footnote font-normal text-muted-foreground">
                  {plan.perMonth}
                </span>
              </p>
              {/* Radio indicator */}
              <div className="absolute top-4 right-4">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? "border-primary gradient-primary" : "border-muted-foreground/40"
                }`}>
                  {isSelected && <Check size={ICON_SIZE.xs} className="text-primary-foreground" strokeWidth={3} />}
                </div>
              </div>
            </button>
          );
        })}
      </motion.div>

      {/* No payment due */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <Check size={16} className="text-foreground" strokeWidth={2.5} />
        <span className="text-subhead font-semibold text-foreground">
          {t("paywall.noPaymentNow")}
        </span>
      </div>

      {/* CTA button - black/foreground */}
      <MotionButton
        onClick={onComplete}
        variant="cta"
        size="xl"
        className="text-headline"
      >
        {t("paywall.ctaTrial")}
      </MotionButton>

      {/* Legal */}
      <p className="text-caption-1 text-muted-foreground text-center mt-3 leading-relaxed">
        {t("paywall.legalTrial")}
      </p>
    </div>
  );
};

export default PaywallScreen;
