// ============================================================================
// defaultAssignment — auto-assign rules za programe i nutrition template-e
// ============================================================================
//
// Trener može označiti svoj program/template kao "default" za određenu nivo
// kategoriju klijenta (beginner/intermediate/advanced). Pri client onboarding-u,
// algoritam pretražuje program-e i template-e i dodeljuje onaj sa matching tag-om.
//
// Implementacija: tag string `default_for_<level>` u `tags` array-u (no DB migracija).
// Mutually exclusive — samo jedan `default_for_*` po resursu (set helper čisti ostale).
// ============================================================================

export type DefaultLevel = "beginner" | "intermediate" | "advanced";

export const DEFAULT_LEVELS: readonly DefaultLevel[] = ["beginner", "intermediate", "advanced"] as const;

const PREFIX = "default_for_";

export function getDefaultLevel(tags: string[]): DefaultLevel | null {
  for (const level of DEFAULT_LEVELS) {
    if (tags.includes(`${PREFIX}${level}`)) return level;
  }
  return null;
}

/**
 * Dodaje (ili menja) `default_for_<level>` tag u listi. Ako je `level` null,
 * skida sve `default_for_*` markere — resurs više nije auto-assignable default.
 */
export function setDefaultLevel(tags: string[], level: DefaultLevel | null): string[] {
  const cleaned = tags.filter((t) => !t.startsWith(PREFIX));
  if (level) cleaned.push(`${PREFIX}${level}`);
  return cleaned;
}
