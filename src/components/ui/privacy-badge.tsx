// PrivacyBadge — "Your data stays private" signal
// Spec: design-system/MASTER.md §4 — privacy-first messaging (WS-8 G3)
//
// Trigger za Period/Cycle Tracker + Biohacking kategorije iz ui-ux-pro-max
// (decision rules: must_have: data-privacy, must_have: scientific-credibility).
//
// Varijante:
//   - inline (default): Shield icon + kratki tekst, koristi se u Onboarding / Paywall
//   - compact: samo lock icon + tooltip, pored osetljivih inputa (weight, cycle date)

import { Lock, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  variant?: "inline" | "compact";
  className?: string;
  /** Override text (default je privacy.badge + privacy.badgeDetail) */
  label?: string;
  sublabel?: string;
}

export const PrivacyBadge = ({
  variant = "inline",
  className = "",
  label,
  sublabel,
}: Props) => {
  const { t } = useLanguage();

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center gap-1 text-caption-2 text-muted-foreground ${className}`}
      >
        <Lock size={12} aria-hidden="true" />
        {label ?? t("privacy.localOnly")}
      </span>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl bg-success/10 border border-success/20 p-3 ${className}`}
      role="status"
    >
      <div className="shrink-0 pt-0.5 breathe">
        <Shield size={18} className="text-success" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-footnote font-semibold text-foreground">
          {label ?? t("privacy.badge")}
        </p>
        <p className="text-caption-1 text-muted-foreground mt-0.5">
          {sublabel ?? t("privacy.badgeDetail")}
        </p>
      </div>
    </div>
  );
};
