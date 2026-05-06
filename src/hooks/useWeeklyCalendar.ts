// ============================================================================
// useWeeklyCalendar — derive 7-dnevnog prozora iz UserStatus.training.queue
// Spec: Faza 4.3 (Korekcija Faze 4 — Hibridni kalendar/queue model)
// ============================================================================
//
// Pure derive hook. NE piše u DB. Shift detekcija je već odrađena u Sync
// Engine-u (processDailyCheckIn / pauseEvent flow-ovi); ovde samo renderujemo
// trenutno stanje queue.sessions[].scheduledDate kroz mapper.
// ============================================================================

import { useMemo } from 'react';
import { useUserStatus } from './useUserStatus';
import {
  mapQueueToWeek,
  getWeekStartDate,
  type WeeklyCalendarView,
} from '@/utils/training/weeklyCalendarMapper';

export interface UseWeeklyCalendarResult {
  view: WeeklyCalendarView | null;
  isLoading: boolean;
  error: Error | null;
}

export function useWeeklyCalendar(clientId: string | null): UseWeeklyCalendarResult {
  const { status, isLoading, error } = useUserStatus(clientId);

  // Memoizujemo "today" na kalendarski dan — ne re-renderuje se na svaki minut
  const todayKey = useMemo(() => new Date().toDateString(), []);
  const today = useMemo(() => new Date(todayKey), [todayKey]);
  const weekStart = useMemo(() => getWeekStartDate(today), [today]);

  const view = useMemo<WeeklyCalendarView | null>(() => {
    if (!status?.training.queue) return null;
    return mapQueueToWeek(status.training.queue, weekStart, today);
  }, [status, weekStart, today]);

  return { view, isLoading, error };
}
