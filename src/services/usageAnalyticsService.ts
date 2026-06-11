// ============================================================================
// usageAnalyticsService — lagana self-hosted analitika korišćenja (Faza 4.2)
// Spec: PLAN_RADA_WHITELABEL.md Faza 4.2 — MVP pitanje "šta se koristi",
// bez third-party servisa (privacy + white-label model kopija-po-treneru).
// ============================================================================
//
// Dizajn principi:
//   - FAIL-SILENT: analitika NIKAD ne sme da sruši UX. Svaki flush je
//     best-effort; greške se gutaju, eventi se ne retry-uju (minimalan
//     footprint, gubitak par eventova je prihvatljiv za MVP analitiku).
//   - BATCHING: eventi idu u in-memory queue; flush na 10 eventova, na 30s,
//     ili na pagehide (tab close / navigacija van app-a).
//   - THROTTLE: duplikat page_view za isti path unutar 5s se ignoriše
//     (AnimatePresence remount, StrictMode double-effect itd.).
//   - MOCK AUTH: u VITE_DEV_MOCK_AUTH modu sve je no-op (nema sesije,
//     RLS bi svakako odbio insert — ne zagađujemo dev konzolu greškama).
//   - BEZ PII: samo event_type + event_name, nikakav payload.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export type UsageEventType = 'page_view' | 'feature_use';

interface QueuedUsageEvent {
  event_type: UsageEventType;
  event_name: string;
  created_at: string; // klijentski timestamp — tačniji od DB default-a zbog batching kašnjenja
}

// Pragovi batching/throttle logike (eksportovani za testove)
export const USAGE_FLUSH_BATCH_SIZE = 10;
export const USAGE_FLUSH_INTERVAL_MS = 30_000;
export const USAGE_PAGE_VIEW_THROTTLE_MS = 5_000;

// ── Module state ─────────────────────────────────────────────────────────────
let queue: QueuedUsageEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lastPageViewAt: Map<string, number> = new Map();
let pagehideListenerRegistered = false;

// Keširan auth za pagehide flush — pagehide handler mora biti sinhron,
// a supabase.auth.getSession() je async. Osvežava se na svaki enqueue.
let cachedAuth: { userId: string; accessToken: string } | null = null;

function isAnalyticsDisabled(): boolean {
  // Čita se pri svakom pozivu (ne na module-level) da bi vi.stubEnv radio u testovima
  return import.meta.env.VITE_DEV_MOCK_AUTH === 'true';
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * trackPageView — beleži posetu rute (event_name = path, npr. '/food').
 * Duplikat istog path-a unutar 5s se ignoriše.
 */
export function trackPageView(path: string): void {
  if (isAnalyticsDisabled()) return;

  const now = Date.now();
  const last = lastPageViewAt.get(path);
  if (last !== undefined && now - last < USAGE_PAGE_VIEW_THROTTLE_MS) return;
  lastPageViewAt.set(path, now);

  enqueue({ event_type: 'page_view', event_name: path, created_at: new Date(now).toISOString() });
}

/**
 * trackFeature — beleži upotrebu ključne feature (npr. 'meal_swap').
 */
export function trackFeature(name: string): void {
  if (isAnalyticsDisabled()) return;
  enqueue({ event_type: 'feature_use', event_name: name, created_at: new Date().toISOString() });
}

/**
 * flushUsageEvents — pošalji nakupljene evente u usage_events tabelu.
 * Fail-silent: bez sesije ili na grešku — eventi se odbacuju, ništa ne puca.
 */
export async function flushUsageEvents(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;

  // Snapshot + reset pre await-a — novi eventi tokom flush-a idu u sledeći batch
  const batch = queue;
  queue = [];

  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session?.user?.id) return; // nema sesije → odbaci (fail-silent)

    cachedAuth = { userId: session.user.id, accessToken: session.access_token };

    await supabase
      .from('usage_events')
      .insert(batch.map((e) => ({ ...e, user_id: session.user.id })));
    // Greška iz insert-a se namerno ignoriše — fail-silent
  } catch {
    // Fail-silent: analitika ne sme da sruši UX
  }
}

// ── Trener uvid ──────────────────────────────────────────────────────────────

export interface UsageSummaryRow {
  eventType: UsageEventType;
  eventName: string;
  count: number;
}

/**
 * getUsageSummary — agregat za trener dashboard: broj eventova po
 * (event_type, event_name) u poslednjih `daysBack` dana, sortiran opadajuće.
 *
 * Agregacija je klijentska (PostgREST group-by aggregate nije uključen);
 * limit 10000 redova je dovoljan za MVP obim (jedan trener + klijentkinje).
 */
export async function getUsageSummary(daysBack: number): Promise<UsageSummaryRow[]> {
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('usage_events')
    .select('event_type, event_name')
    .gte('created_at', cutoff)
    .limit(10_000);

  if (error) {
    throw new Error(`getUsageSummary(${daysBack}) failed: ${error.message}`);
  }

  const counts = new Map<string, UsageSummaryRow>();
  for (const row of data ?? []) {
    const key = `${row.event_type}|${row.event_name}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        eventType: row.event_type as UsageEventType,
        eventName: row.event_name,
        count: 1,
      });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count);
}

// ── Interno: batching + pagehide ─────────────────────────────────────────────

function enqueue(event: QueuedUsageEvent): void {
  queue.push(event);
  registerPagehideListener();
  refreshAuthCache();

  if (queue.length >= USAGE_FLUSH_BATCH_SIZE) {
    void flushUsageEvents();
  } else if (flushTimer === null) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushUsageEvents();
    }, USAGE_FLUSH_INTERVAL_MS);
  }
}

/** Osveži keširan token za sinhron pagehide flush (jeftino — čita localStorage). */
function refreshAuthCache(): void {
  void supabase.auth
    .getSession()
    .then(({ data }) => {
      const session = data?.session;
      if (session?.user?.id) {
        cachedAuth = { userId: session.user.id, accessToken: session.access_token };
      }
    })
    .catch(() => {
      // Fail-silent
    });
}

function registerPagehideListener(): void {
  if (pagehideListenerRegistered || typeof window === 'undefined') return;
  pagehideListenerRegistered = true;
  window.addEventListener('pagehide', flushOnPagehide);
}

/**
 * flushOnPagehide — poslednja šansa za slanje pre zatvaranja taba.
 *
 * Zašto NE navigator.sendBeacon: beacon ne može da nosi Authorization
 * header, pa bi RLS (auth.uid() = user_id) odbio insert. Funkcionalni
 * ekvivalent je fetch sa keepalive: true — browser završava request i
 * posle unload-a, a header-i su podržani. Fallback: običan supabase
 * insert (best-effort, može biti prekinut).
 */
function flushOnPagehide(): void {
  if (queue.length === 0) return;
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const batch = queue;
  queue = [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!cachedAuth || !supabaseUrl || !supabaseKey || typeof fetch !== 'function') {
    // Fallback: async insert — možda ne stigne pre unload-a, fail-silent
    const auth = cachedAuth;
    if (auth) {
      void supabase
        .from('usage_events')
        .insert(batch.map((e) => ({ ...e, user_id: auth.userId })))
        .then(
          () => undefined,
          () => undefined,
        );
    }
    return;
  }

  try {
    void fetch(`${supabaseUrl}/rest/v1/usage_events`, {
      method: 'POST',
      keepalive: true, // beacon-ekvivalent: preživljava unload
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${cachedAuth.accessToken}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(batch.map((e) => ({ ...e, user_id: cachedAuth!.userId }))),
    }).catch(() => undefined);
  } catch {
    // Fail-silent
  }
}

// ── Test helper ──────────────────────────────────────────────────────────────

/** Resetuje sav module state — koristi se ISKLJUČIVO u unit testovima. */
export function __resetUsageAnalyticsForTest(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  queue = [];
  lastPageViewAt = new Map();
  cachedAuth = null;
  if (pagehideListenerRegistered && typeof window !== 'undefined') {
    window.removeEventListener('pagehide', flushOnPagehide);
  }
  pagehideListenerRegistered = false;
}
