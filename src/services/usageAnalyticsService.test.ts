// ============================================================================
// usageAnalyticsService — unit testovi za batching/throttle/fail-silent logiku
// Faza 4.2 (PLAN_RADA_WHITELABEL.md) — self-hosted analitika korišćenja
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  trackPageView,
  trackFeature,
  flushUsageEvents,
  getUsageSummary,
  USAGE_FLUSH_BATCH_SIZE,
  USAGE_FLUSH_INTERVAL_MS,
  USAGE_PAGE_VIEW_THROTTLE_MS,
  __resetUsageAnalyticsForTest,
} from './usageAnalyticsService';

// ── Supabase mock ────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const insertMock = vi.fn();
  const getSessionMock = vi.fn();
  // select chain za getUsageSummary: from().select().gte().limit()
  const limitMock = vi.fn();
  const gteMock = vi.fn(() => ({ limit: limitMock }));
  const selectMock = vi.fn(() => ({ gte: gteMock }));
  const fromMock = vi.fn(() => ({ insert: insertMock, select: selectMock }));
  return { insertMock, getSessionMock, fromMock, selectMock, gteMock, limitMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mocks.getSessionMock },
    from: mocks.fromMock,
  },
}));

const SESSION = {
  data: {
    session: { user: { id: 'user-1' }, access_token: 'jwt-token' },
  },
};

/** Isprazni microtask queue (flush ima 2+ await koraka). */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  __resetUsageAnalyticsForTest();
  mocks.insertMock.mockReset().mockResolvedValue({ error: null });
  mocks.getSessionMock.mockReset().mockResolvedValue(SESSION);
  mocks.fromMock.mockClear();
  mocks.limitMock.mockReset();
});

afterEach(() => {
  __resetUsageAnalyticsForTest();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ── Batching ─────────────────────────────────────────────────────────────────

describe('batching', () => {
  it('flush-uje automatski kad queue dostigne 10 eventova', async () => {
    for (let i = 0; i < USAGE_FLUSH_BATCH_SIZE; i++) {
      trackFeature(`feature_${i}`);
    }
    await flushMicrotasks();

    expect(mocks.insertMock).toHaveBeenCalledTimes(1);
    const rows = mocks.insertMock.mock.calls[0][0];
    expect(rows).toHaveLength(USAGE_FLUSH_BATCH_SIZE);
    expect(rows[0]).toMatchObject({
      event_type: 'feature_use',
      event_name: 'feature_0',
      user_id: 'user-1',
    });
    expect(rows[0].created_at).toEqual(expect.any(String));
  });

  it('ne flush-uje ispod praga bez timer-a', async () => {
    trackFeature('meal_swap');
    trackFeature('meal_swap');
    await flushMicrotasks();

    expect(mocks.insertMock).not.toHaveBeenCalled();
  });

  it('flush-uje posle 30s preko timer-a', async () => {
    trackFeature('meal_swap');
    await vi.advanceTimersByTimeAsync(USAGE_FLUSH_INTERVAL_MS);
    await flushMicrotasks();

    expect(mocks.insertMock).toHaveBeenCalledTimes(1);
    expect(mocks.insertMock.mock.calls[0][0]).toHaveLength(1);
  });

  it('ručni flushUsageEvents šalje queue odmah i prazan queue je no-op', async () => {
    trackFeature('meal_swap');
    await flushUsageEvents();
    expect(mocks.insertMock).toHaveBeenCalledTimes(1);

    await flushUsageEvents(); // queue je sada prazan
    expect(mocks.insertMock).toHaveBeenCalledTimes(1);
  });
});

// ── Page view throttle ───────────────────────────────────────────────────────

describe('page_view throttle', () => {
  it('ignoriše duplikat istog path-a unutar 5s', async () => {
    trackPageView('/food');
    trackPageView('/food'); // duplikat — ignorisan
    trackPageView('/home'); // drugi path — prolazi
    await flushUsageEvents();

    const rows = mocks.insertMock.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows.map((r: { event_name: string }) => r.event_name)).toEqual(['/food', '/home']);
  });

  it('dozvoljava isti path posle isteka throttle prozora', async () => {
    trackPageView('/food');
    await vi.advanceTimersByTimeAsync(USAGE_PAGE_VIEW_THROTTLE_MS);
    trackPageView('/food');
    await flushUsageEvents();

    // Prvi page_view je možda već flush-ovan 30s timer-om? Ne — 5s < 30s.
    const rows = mocks.insertMock.mock.calls[0][0];
    expect(rows.filter((r: { event_name: string }) => r.event_name === '/food')).toHaveLength(2);
  });
});

// ── Fail-silent ──────────────────────────────────────────────────────────────

describe('fail-silent', () => {
  it('ne baca grešku kad insert pukne', async () => {
    mocks.insertMock.mockRejectedValue(new Error('network down'));
    trackFeature('meal_swap');
    await expect(flushUsageEvents()).resolves.toBeUndefined();
  });

  it('ne baca grešku kad getSession pukne', async () => {
    mocks.getSessionMock.mockRejectedValue(new Error('auth broken'));
    trackFeature('meal_swap');
    await expect(flushUsageEvents()).resolves.toBeUndefined();
    expect(mocks.insertMock).not.toHaveBeenCalled();
  });

  it('odbacuje evente bez aktivne sesije (insert se ne zove)', async () => {
    mocks.getSessionMock.mockResolvedValue({ data: { session: null } });
    trackFeature('meal_swap');
    await flushUsageEvents();
    expect(mocks.insertMock).not.toHaveBeenCalled();
  });
});

// ── Mock auth no-op ──────────────────────────────────────────────────────────

describe('VITE_DEV_MOCK_AUTH no-op', () => {
  it('trackFeature i trackPageView ne rade ništa u mock modu', async () => {
    vi.stubEnv('VITE_DEV_MOCK_AUTH', 'true');
    trackFeature('meal_swap');
    trackPageView('/food');
    await flushUsageEvents();
    expect(mocks.insertMock).not.toHaveBeenCalled();
  });
});

// ── Pagehide flush ───────────────────────────────────────────────────────────

describe('pagehide flush', () => {
  it('šalje queue preko fetch keepalive sa Authorization header-om', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'anon-key');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    trackFeature('meal_swap');
    await flushMicrotasks(); // pusti refreshAuthCache da keširа token

    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/rest/v1/usage_events');
    expect(init.keepalive).toBe(true);
    expect(init.headers.Authorization).toBe('Bearer jwt-token');
    expect(init.headers.apikey).toBe('anon-key');
    const body = JSON.parse(init.body);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ event_name: 'meal_swap', user_id: 'user-1' });

    // Queue je ispražnjen — naknadni flush nema šta da šalje
    await flushUsageEvents();
    expect(mocks.insertMock).not.toHaveBeenCalled();
  });

  it('fallback na supabase insert kad fetch/env nisu dostupni', async () => {
    // Bez VITE_SUPABASE_URL stub-a → keepalive grana se preskače
    vi.stubEnv('VITE_SUPABASE_URL', '');
    trackFeature('meal_swap');
    await flushMicrotasks(); // keširaj auth

    window.dispatchEvent(new Event('pagehide'));
    await flushMicrotasks();

    expect(mocks.insertMock).toHaveBeenCalledTimes(1);
  });

  it('pagehide sa praznim queue-om je no-op', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    trackFeature('meal_swap'); // registruje listener
    __resetUsageAnalyticsForTest();

    window.dispatchEvent(new Event('pagehide'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── getUsageSummary ──────────────────────────────────────────────────────────

describe('getUsageSummary', () => {
  it('agregira po (event_type, event_name) i sortira opadajuće', async () => {
    mocks.limitMock.mockResolvedValue({
      data: [
        { event_type: 'page_view', event_name: '/food' },
        { event_type: 'page_view', event_name: '/food' },
        { event_type: 'page_view', event_name: '/food' },
        { event_type: 'feature_use', event_name: 'meal_swap' },
        { event_type: 'feature_use', event_name: 'meal_swap' },
        { event_type: 'page_view', event_name: '/home' },
      ],
      error: null,
    });

    const summary = await getUsageSummary(7);

    expect(summary).toEqual([
      { eventType: 'page_view', eventName: '/food', count: 3 },
      { eventType: 'feature_use', eventName: 'meal_swap', count: 2 },
      { eventType: 'page_view', eventName: '/home', count: 1 },
    ]);

    // Cutoff filter koristi gte na created_at
    expect(mocks.gteMock).toHaveBeenCalledWith('created_at', expect.any(String));
  });

  it('baca grešku kad upit pukne', async () => {
    mocks.limitMock.mockResolvedValue({ data: null, error: { message: 'RLS denied' } });
    await expect(getUsageSummary(7)).rejects.toThrow('getUsageSummary(7) failed: RLS denied');
  });

  it('vraća prazan niz kad nema podataka', async () => {
    mocks.limitMock.mockResolvedValue({ data: [], error: null });
    await expect(getUsageSummary(30)).resolves.toEqual([]);
  });
});
