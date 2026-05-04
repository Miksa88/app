// ============================================================================
// useClientActivity — aggregator za trener-side activity log (W-3 wire-up)
// ============================================================================
//
// Vraća poslednjih ~10 događaja iz klijentkinjinog života:
//   - Meal logs (grupisani po danu) → "🥗 Logged X/Y meals"
//   - Daily check-ins → "📝 Daily check-in: energy X, sleep Yh"
//   - Weekly check-ins → "📝 Submitted weekly check-in"
//
// Uses 14-day lookback. Sortirano DESC po timestamp-u, top 10.
// Zamenjuje statički MOCK_ACTIVITY_LOG iz src/data/trainerMockData.ts.
//
// NOTE: Workout completion log nije uključen u MVP — queue.sessions ima
// `completedAt`, ali za to trebamo `useUserStatus(clientId)` za drugog usera
// (ne trenutni auth) što useUserStatus trenutno ne radi. Ostaje za follow-up.
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityEntry {
  id: string;
  icon: string;
  description: string;
  time: string;
  timestamp: Date;
}

const LOOKBACK_DAYS = 14;
const MAX_ENTRIES = 10;

function relativeTime(date: Date): string {
  const ms = Date.now() - date.getTime();
  const minutes = Math.round(ms / 60_000);
  const hours = Math.round(ms / 3_600_000);
  const days = Math.round(ms / 86_400_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return date.toISOString().slice(0, 10);
}

export function useClientActivity(clientId: string | null | undefined) {
  return useQuery<ActivityEntry[], Error>({
    queryKey: ['clientActivity', clientId ?? 'anon'],
    queryFn: async () => {
      if (!clientId) return [];

      const since = new Date();
      since.setDate(since.getDate() - LOOKBACK_DAYS);
      const sinceIso = since.toISOString();
      const sinceDateOnly = sinceIso.slice(0, 10);

      const [mealRes, checkInRes, weeklyRes] = await Promise.all([
        supabase
          .from('meal_logs')
          .select('id, status, logged_at')
          .eq('user_id', clientId)
          .gte('logged_at', sinceIso)
          .order('logged_at', { ascending: false })
          .limit(40),
        supabase
          .from('daily_check_ins')
          .select('id, date, energy_level, sleep_hours')
          .eq('user_id', clientId)
          .gte('date', sinceDateOnly)
          .order('date', { ascending: false })
          .limit(7),
        supabase
          .from('weekly_check_ins')
          .select('id, week_start_date')
          .eq('user_id', clientId)
          .gte('week_start_date', sinceDateOnly)
          .order('week_start_date', { ascending: false })
          .limit(3),
      ]);

      if (mealRes.error) throw new Error(`useClientActivity meals: ${mealRes.error.message}`);
      if (checkInRes.error) throw new Error(`useClientActivity check-ins: ${checkInRes.error.message}`);
      if (weeklyRes.error) throw new Error(`useClientActivity weekly: ${weeklyRes.error.message}`);

      const entries: ActivityEntry[] = [];

      // Meal logs grupisani po danu (broj loggovanih/total)
      const mealsByDate = new Map<string, { logged: number; total: number; latest: Date }>();
      for (const row of mealRes.data ?? []) {
        const d = new Date(row.logged_at);
        const key = d.toISOString().slice(0, 10);
        const acc = mealsByDate.get(key) ?? { logged: 0, total: 0, latest: d };
        acc.total++;
        if (row.status === 'logged') acc.logged++;
        if (d > acc.latest) acc.latest = d;
        mealsByDate.set(key, acc);
      }
      for (const [key, v] of mealsByDate) {
        entries.push({
          id: `meal-${key}`,
          icon: '🥗',
          description: `Logged ${v.logged}/${v.total} meals`,
          time: relativeTime(v.latest),
          timestamp: v.latest,
        });
      }

      for (const row of checkInRes.data ?? []) {
        const d = new Date(`${row.date}T12:00:00Z`);
        const energy = row.energy_level ?? '—';
        const sleep = row.sleep_hours ?? '—';
        entries.push({
          id: `daily-${row.id}`,
          icon: '📝',
          description: `Daily check-in: energy ${energy}/10, sleep ${sleep}h`,
          time: relativeTime(d),
          timestamp: d,
        });
      }

      for (const row of weeklyRes.data ?? []) {
        const d = new Date(`${row.week_start_date}T12:00:00Z`);
        entries.push({
          id: `weekly-${row.id}`,
          icon: '📝',
          description: 'Submitted weekly check-in',
          time: relativeTime(d),
          timestamp: d,
        });
      }

      entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      return entries.slice(0, MAX_ENTRIES);
    },
    enabled: !!clientId,
    staleTime: 60 * 1000,
  });
}
