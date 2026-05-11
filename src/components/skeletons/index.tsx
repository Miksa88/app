// Per-surface skeleton komponente (WS-3)
// Spec: design-system/MASTER.md §2.6 (Skeleton)
//
// Svaki export prikazuje layout-stabilan skeleton dok se data fetchuje.
// Koristi shadcn Skeleton kao base (bg-muted + animate-pulse).
// Svi se oslanjaju na isti scrollable wrapper kao realne stranice.

import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * HomeSkeleton — dashboard loading (greeting, weekly strip, today hero, bio rings, fueling, water).
 */
export const HomeSkeleton = () => {
  const { t } = useLanguage();
  return (
  <div className="min-h-screen bg-background-secondary pb-24" aria-busy="true" aria-label={t("a11y.loading")}>
    <div className="px-5 pt-14 pb-2 flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
    {/* Weekly strip */}
    <div className="px-5 mt-3 grid grid-cols-7 gap-1">
      {[...Array(7)].map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
    {/* Today hero */}
    <div className="px-5 mt-4">
      <Skeleton className="h-40 rounded-3xl" />
    </div>
    {/* Bio rings */}
    <div className="px-5 mt-4 grid grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
    {/* Mini stat cards */}
    <div className="px-5 mt-3 grid grid-cols-2 gap-3">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
    {/* Fueling */}
    <div className="px-5 mt-4">
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  </div>
  );
};

/**
 * GymSkeleton — queue-based training screen loading.
 */
export const GymSkeleton = () => {
  const { t } = useLanguage();
  return (
  <div className="min-h-screen bg-background-secondary pb-24" aria-busy="true" aria-label={t("a11y.loading")}>
    <div className="px-5 pt-14 pb-2">
      <Skeleton className="h-9 w-32" />
    </div>
    <div className="px-5 mt-3">
      <Skeleton className="h-20 rounded-2xl" />
    </div>
    <div className="px-5 mt-3 flex gap-2 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-24 rounded-2xl shrink-0" />
      ))}
    </div>
    <div className="px-5 mt-4">
      <Skeleton className="h-48 rounded-3xl" />
    </div>
  </div>
  );
};

/**
 * FoodSkeleton — meal list loading.
 */
export const FoodSkeleton = () => {
  const { t } = useLanguage();
  return (
  <div className="min-h-screen bg-background-secondary pb-24" aria-busy="true" aria-label={t("a11y.loading")}>
    <div className="px-5 pt-14 pb-2">
      <Skeleton className="h-9 w-40" />
    </div>
    <div className="px-5 mt-3">
      <Skeleton className="h-28 rounded-2xl" />
    </div>
    <div className="px-5 mt-4 space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  </div>
  );
};

/**
 * ProgressSkeleton — tabs + stat cards loading.
 */
export const ProgressSkeleton = () => {
  const { t } = useLanguage();
  return (
  <div className="min-h-screen bg-background-secondary pb-24" aria-busy="true" aria-label={t("a11y.loading")}>
    <div className="px-5 pt-14 pb-2">
      <Skeleton className="h-9 w-32" />
    </div>
    <div className="px-5 mt-4">
      <Skeleton className="h-24 rounded-2xl" />
    </div>
    <div className="px-5 mt-3 grid grid-cols-4 gap-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
    <div className="px-5 mt-4">
      <Skeleton className="h-12 rounded-2xl" />
    </div>
    <div className="px-5 mt-3 space-y-2">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  </div>
  );
};

/**
 * TrainerDashboardSkeleton — trainer home loading.
 */
export const TrainerDashboardSkeleton = () => {
  const { t } = useLanguage();
  return (
  <div className="min-h-screen bg-background-secondary pb-24" aria-busy="true" aria-label={t("a11y.loading")}>
    <div className="px-5 pt-14 pb-2 flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
    <div className="px-5 mt-4 grid grid-cols-2 gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
    <div className="px-5 mt-3">
      <Skeleton className="h-40 rounded-2xl" />
    </div>
    <div className="px-5 mt-3 space-y-2">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  </div>
  );
};

/**
 * ClientProfileSkeleton — trainer client detail loading.
 */
export const ClientProfileSkeleton = () => {
  const { t } = useLanguage();
  return (
  <div className="min-h-screen bg-background-secondary pb-24" aria-busy="true" aria-label={t("a11y.loading")}>
    <div className="px-5 pt-4 pb-2">
      <Skeleton className="h-10 w-20" />
    </div>
    <div className="px-5 mt-2">
      <Skeleton className="h-32 rounded-3xl" />
    </div>
    <div className="px-5 mt-4">
      <Skeleton className="h-10 rounded-xl" />
    </div>
    <div className="px-5 mt-3 space-y-2">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  </div>
  );
};

/**
 * ListSkeleton — generic list skeleton (trainer clients, nutrition templates, etc.).
 */
export const ListSkeleton = ({ rows = 5 }: { rows?: number }) => {
  const { t } = useLanguage();
  return (
  <div className="space-y-2" aria-busy="true" aria-label={t("a11y.loading")}>
    {[...Array(rows)].map((_, i) => (
      <Skeleton key={i} className="h-18 rounded-2xl" />
    ))}
  </div>
  );
};
