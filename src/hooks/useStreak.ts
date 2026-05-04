// ============================================================================
// useStreak — consecutive logged days (W-5 wire-up)
// ============================================================================
//
// Vraća broj uzastopnih dana u kojima je klijentkinja unela daily check-in,
// počev od današnjeg dana ili poslednjeg unetog dana. Ako je poslednji unos
// bio juče, streak nastavlja; ako je danas pao između, streak se reset-uje.
//
// Koristi se u Home.tsx za milestone celebration trigger
// (useStreakMilestones thresholds: 3, 10, 50, 100, 365, 1000).
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const LOOKBACK_DAYS = 30; // dovoljno za sve thresholds osim 50/100/365/1000

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function useStreak(clientId: string | null | undefined) {
  return useQuery<number, Error>({
    queryKey: ['streak', clientId ?? 'anon'],
    queryFn: async () => {
      if (!clientId) return 0;

      const since = new Date();
      since.setDate(since.getDate() - LOOKBACK_DAYS);

      const { data, error } = await supabase
        .from('daily_check_ins')
        .select('date')
        .eq('user_id', clientId)
        .gte('date', dateOnly(since))
        .order('date', { ascending: false });

      if (error) throw new Error(`useStreak: ${error.message}`);
      const dates = (data ?? []).map(r => r.date as string);
      if (dates.length === 0) return 0;

      // Most recent entry mora biti danas ili juče da streak vredi
      const today = dateOnly(new Date());
      const gapToToday = daysBetween(dates[0], today);
      if (gapToToday > 1) return 0;

      // Brojimo uzastopne dane unazad
      let streak = 1;
      for (let i = 1; i < dates.length; i++) {
        const gap = daysBetween(dates[i], dates[i - 1]);
        if (gap === 1) streak++;
        else break;
      }
      return streak;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
