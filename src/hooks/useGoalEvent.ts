// ============================================================================
// useGoalEvent — manages event-specific goal (svadba, putovanje, more)
// ============================================================================
//
// Beta: localStorage. Sledeća iteracija: extend profiles tabelu sa
// goal_event_name + goal_event_date + goal_event_target_weight kolonama.
// ============================================================================

import { useEffect, useState, useCallback } from "react";

export interface GoalEvent {
  name: string;          // "Svadba", "Letovanje", "Krštenje"
  dateISO: string;       // YYYY-MM-DD
  targetWeightKg?: number;
  notes?: string;
}

const STORAGE_KEY = "fbi:goal_event";

function loadFromStorage(): GoalEvent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GoalEvent;
  } catch {
    return null;
  }
}

function saveToStorage(event: GoalEvent | null): void {
  try {
    if (event === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
    }
  } catch {
    // ignore
  }
}

export interface UseGoalEventResult {
  event: GoalEvent | null;
  daysRemaining: number | null;
  setEvent: (event: GoalEvent | null) => void;
}

export function useGoalEvent(): UseGoalEventResult {
  const [event, setEventState] = useState<GoalEvent | null>(() => loadFromStorage());

  const setEvent = useCallback((next: GoalEvent | null) => {
    setEventState(next);
    saveToStorage(next);
  }, []);

  const daysRemaining = (() => {
    if (!event) return null;
    const target = new Date(event.dateISO);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  })();

  // Auto-cleanup when event passes >7 days ago
  useEffect(() => {
    if (event && daysRemaining !== null && daysRemaining < -7) {
      setEvent(null);
    }
  }, [event, daysRemaining, setEvent]);

  return { event, daysRemaining, setEvent };
}
