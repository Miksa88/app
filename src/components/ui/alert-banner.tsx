// AlertBanner — unified inline notification (warning / info / success tones)
// Spec: design-system/MASTER.md §3 — Patterns
//
// Primer:
//   <AlertBanner tone="warning" icon={AlertTriangle}>
//     2 klijentkinja na oprezu
//   </AlertBanner>
//   <AlertBanner tone="info" onDismiss={...}>Lutealna faza +150 kcal</AlertBanner>

import { type ComponentType, type ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Tone = "info" | "warning" | "success" | "destructive" | "neutral";

const TONE_STYLES: Record<Tone, { container: string; iconColor: string }> = {
  info: { container: "bg-info/10 border-info/20 text-info", iconColor: "text-info" },
  warning: { container: "bg-warning/10 border-warning/20 text-foreground", iconColor: "text-warning" },
  success: { container: "bg-success/10 border-success/20 text-foreground", iconColor: "text-success" },
  destructive: { container: "bg-destructive/10 border-destructive/20 text-foreground", iconColor: "text-destructive" },
  neutral: { container: "bg-muted/50 border-border text-foreground", iconColor: "text-muted-foreground" },
};

interface Props {
  tone?: Tone;
  icon?: ComponentType<LucideProps>;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const AlertBanner = ({
  tone = "info",
  icon: Icon,
  title,
  children,
  action,
  onDismiss,
  className = "",
}: Props) => {
  const { t } = useLanguage();
  const styles = TONE_STYLES[tone];

  return (
    <div
      role={tone === "destructive" || tone === "warning" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border p-4 ${styles.container} ${className}`}
    >
      {Icon && (
        <div className="shrink-0 pt-0.5">
          <Icon size={20} className={styles.iconColor} aria-hidden="true" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && <p className="text-body font-semibold mb-0.5">{title}</p>}
        <div className="text-subhead">{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label={t("common.close")}
          className="shrink-0 min-w-11 min-h-11 flex items-center justify-center opacity-60 active:opacity-100"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
