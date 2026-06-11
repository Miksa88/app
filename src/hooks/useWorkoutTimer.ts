// ============================================================================
// useWorkoutTimer — tajmeri aktivnog treninga (Task 1.2)
//
// Elapsed tajmer (1s tick, zamrznut na pauzi) + rest countdown tick.
// Garantovan cleanup: svaki interval se čisti u effect cleanup-u, pa nema
// duplog tajmera na remount-u. onRestTick ide kroz ref da deps ostanu
// minimalni i bez stale-closure problema.
// ============================================================================

import { useEffect, useRef, useState } from "react";

interface UseWorkoutTimerOptions {
  /** Zamrzava oba tajmera */
  paused: boolean;
  /** Rest ekran aktivan → rest tick svake sekunde */
  resting: boolean;
  /** Poziva se svake sekunde dok traje odmor (dispatch REST_TICK) */
  onRestTick: () => void;
}

export function useWorkoutTimer({ paused, resting, onRestTick }: UseWorkoutTimerOptions) {
  const [elapsed, setElapsed] = useState(0);

  // Elapsed tajmer — functional update, nema stale closure.
  useEffect(() => {
    if (paused) return;
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [paused]);

  // Rest countdown — callback kroz ref da interval ne zavisi od identiteta
  // onRestTick funkcije (reducer dispatch je ionako stabilan).
  const onRestTickRef = useRef(onRestTick);
  useEffect(() => {
    onRestTickRef.current = onRestTick;
  }, [onRestTick]);

  useEffect(() => {
    if (!resting || paused) return;
    const i = setInterval(() => onRestTickRef.current(), 1000);
    return () => clearInterval(i);
  }, [resting, paused]);

  return { elapsed };
}

/** Format mm:ss */
export function formatTime(s: number): string {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
