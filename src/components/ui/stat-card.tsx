// StatCard — unified stat display (value + label)
// Spec: design-system/MASTER.md §3 — Patterns
//
// Varijante (variant):
//   - default  → bg-card + card-shadow (standard grid stat)
//   - glass    → backdrop-blur (za hero context na gradient)
//   - compact  → manji padding (za 3-4 col grids)
//
// Layout:
//   - default      → ikona iznad (mb-1) + vrednost + label + subtitle (stacked)
//   - apple-health → ikona + trend u gornjem redu (flex justify-between), onda vrednost, pa label
//                    (koristi se u TrainerDashboard, TrainerAnalytics, Progress stats grids)
//   - centered     → hero-style centered layout: velika ikona iznad, vrednost ispod, label ispod
//                    (koristi se u Progress 4-col compact + Milestones 2-col hero — WS-8 G8)

import { type ComponentType, type ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Props {
  value: ReactNode;
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  iconBg?: string;
  iconColor?: string;
  variant?: "default" | "glass" | "compact";
  layout?: "default" | "apple-health" | "centered";
  trend?: string;
  trendDirection?: "up" | "down";
  trendIcon?: ComponentType<LucideProps>;
  onClick?: () => void;
}

export const StatCard = ({
  value,
  label,
  subtitle,
  icon,
  iconBg = "bg-primary/10",
  iconColor = "text-primary",
  variant = "default",
  layout = "default",
  trend,
  trendDirection,
  trendIcon,
  onClick,
}: Props) => {
  const baseClasses = {
    default: "bg-card card-shadow p-4",
    glass: "bg-white/15 backdrop-blur-sm text-primary-foreground p-3",
    compact: "bg-card card-shadow p-3",
  }[variant];

  const Component = onClick ? "button" : "div";

  const trendColor =
    trendDirection === "up"
      ? "text-success"
      : trendDirection === "down"
      ? "text-destructive"
      : "text-muted-foreground";

  const TrendIcon =
    trendIcon ?? (trendDirection === "down" ? ArrowDownRight : ArrowUpRight);

  // Centered hero: velika ikona iznad, vrednost ispod, label ispod (hero-summary cards)
  if (layout === "centered") {
    return (
      <Component
        onClick={onClick}
        className={`w-full rounded-2xl text-center flex flex-col items-center ${baseClasses} ${
          onClick ? "active:brightness-95 transition-[filter]" : ""
        }`}
      >
        {icon && (
          <div className={`${iconColor} mb-1`} aria-hidden="true">
            {icon}
          </div>
        )}
        <p className="text-title-2 font-bold text-foreground tabular-nums leading-none">
          {value}
        </p>
        <p className="text-caption-1 font-semibold text-muted-foreground mt-1">{label}</p>
        {subtitle && (
          <p className="text-caption-2 text-muted-foreground/70 mt-0.5">{subtitle}</p>
        )}
      </Component>
    );
  }

  // Apple Health style: ikona + trend u gornjem redu, velika vrednost, label ispod
  if (layout === "apple-health") {
    return (
      <Component
        onClick={onClick}
        className={`w-full rounded-2xl text-left ${baseClasses} ${
          onClick ? "active:brightness-95 transition-[filter]" : ""
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          {icon ? (
            <div
              className={`w-9 h-9 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center`}
            >
              {icon}
            </div>
          ) : (
            <div />
          )}
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-caption-2 font-bold ${trendColor}`}
            >
              <TrendIcon size={12} aria-hidden="true" />
              {trend}
            </span>
          )}
        </div>
        <p className="text-title-1 font-bold text-foreground tracking-tight tabular-nums leading-none">
          {value}
        </p>
        <p className="text-caption-1 text-muted-foreground mt-1">{label}</p>
        {subtitle && (
          <p className="text-caption-2 text-muted-foreground/70 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </Component>
    );
  }

  // Default layout: ikona iznad, vrednost + trend u baseline row, label ispod
  return (
    <Component
      onClick={onClick}
      className={`w-full rounded-2xl text-left flex flex-col gap-1 ${baseClasses} ${
        onClick ? "active:brightness-95 transition-[filter]" : ""
      }`}
    >
      {icon && (
        <div
          className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center ${iconColor} mb-1`}
        >
          {icon}
        </div>
      )}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <p className="text-title-2 font-bold text-foreground tabular-nums leading-none">
          {value}
        </p>
        {trend && (
          <span className={`text-caption-1 font-semibold ${trendColor}`}>{trend}</span>
        )}
      </div>
      <p className="text-footnote text-muted-foreground font-medium">{label}</p>
      {subtitle && (
        <p className="text-caption-1 text-muted-foreground/70 mt-0.5">{subtitle}</p>
      )}
    </Component>
  );
};
