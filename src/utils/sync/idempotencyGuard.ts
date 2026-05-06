// ============================================================================
// idempotencyGuard — runtime helper za testove i debug
// Spec: 03_INTEGRATION_LAYER.md Sekcija 3.3 (Idempotentnost)
// ============================================================================
//
// Sync Engine MORA biti idempotentan: pokretanje runSyncRules 2× sa istim
// ulazom mora da daje isti izlaz. Ovaj helper omogucava run-time provjeru
// koja se moze koristiti u dev/test okruzenju.
//
// Production: NE koristi (duplicira posao). Test: KORISTI za sve rule
// scenario testove.
// ============================================================================

import type { UserStatus } from '@/types/userStatus';
import { runSyncRules } from './syncEngine';

export interface IdempotencyResult {
  isIdempotent: boolean;
  iterations: number;
  diffs?: Array<{ iteration: number; diff: string }>;
}

/**
 * Pokrene runSyncRules N puta i poredi izlaze. Vraca true ako su svi
 * identicni (osim transient polja kao lastUpdatedAt koje legitimno menja
 * vrednost svaki put).
 */
export async function assertIdempotent(
  status: UserStatus,
  iterations: number = 3,
): Promise<IdempotencyResult> {
  const results: UserStatus[] = [];

  for (let i = 0; i < iterations; i++) {
    const result = await runSyncRules(deepClone(status));
    results.push(result);
  }

  // Normalizuj transient polja pre poredjenja
  const normalized = results.map(normalizeForComparison);
  const baseline = JSON.stringify(normalized[0]);

  const diffs: Array<{ iteration: number; diff: string }> = [];
  for (let i = 1; i < normalized.length; i++) {
    const current = JSON.stringify(normalized[i]);
    if (current !== baseline) {
      diffs.push({ iteration: i, diff: shortDiff(baseline, current) });
    }
  }

  return {
    isIdempotent: diffs.length === 0,
    iterations,
    diffs: diffs.length > 0 ? diffs : undefined,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function deepClone<T>(obj: T): T {
  if (typeof structuredClone !== 'undefined') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function normalizeForComparison(status: UserStatus): UserStatus {
  // lastUpdatedAt legitimno moze da varira — ne testiraj
  // _blockMacroChangesUntil je relativno na trenutni timestamp — ne testiraj
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const norm = JSON.parse(JSON.stringify(status)) as any;
  delete norm.lastUpdatedAt;
  delete norm._blockMacroChangesUntil;
  delete norm._blockProgressionUntil;
  return norm;
}

function shortDiff(a: string, b: string): string {
  // Prikazi prvi razlican character
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      const start = Math.max(0, i - 30);
      const end = Math.min(a.length, i + 30);
      return `at pos ${i}: \nA: ...${a.slice(start, end)}...\nB: ...${b.slice(start, end)}...`;
    }
  }
  return `length differs: ${a.length} vs ${b.length}`;
}
