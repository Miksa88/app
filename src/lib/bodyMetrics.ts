// ============================================================================
// bodyMetrics.ts — input validacija za telesne mere (UI layer)
// ============================================================================
// DB kolone profiles.current_weight / height su neograničeni numeric bez CHECK
// constraint-a, a Profile edit UI radi Number(editValue) (prazno → 0, "-5" → -5).
// Bez clamp-a app tiho persistuje besmislene vrednosti. Ovaj guard se koristi i
// u edit handleru (pre optimističnog update-a) i u persist chokepoint-u.
// ============================================================================

export const BODY_METRIC_BOUNDS = {
  currentWeight: { min: 30, max: 250 }, // kg
  height: { min: 120, max: 230 }, // cm
} as const;

export type BodyMetricKey = keyof typeof BODY_METRIC_BOUNDS;

/** Vrati validnu meru ili null ako unos nije upotrebljiv (NaN / van opsega). */
export function clampBodyMetric(key: BodyMetricKey, value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const { min, max } = BODY_METRIC_BOUNDS[key];
  if (value < min || value > max) return null;
  return value;
}
