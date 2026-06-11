// ============================================================================
// useWorkoutState — konsolidovano stanje aktivnog treninga (Task 1.2)
//
// Jedan useReducer drži celokupno session stanje: serije po vežbi,
// indeks tekuće vežbe, per-session zamene vežbi, rest tajmer i dijaloge.
// Ephemeralno video UI stanje ostaje kao useState u stranici.
// ============================================================================

import { useEffect, useReducer } from "react";
import type { ActiveWorkoutSlot } from "@/hooks/useActiveWorkoutSession";
import type { Exercise } from "@/types/training";

export interface SetLog {
  weight: number;
  reps: number;
  rir: number | null;
  done: boolean;
}

export interface WorkoutState {
  /** Indeks tekuće vežbe (slot-index) */
  exerciseIdx: number;
  /** Serije po vežbi — allSets[exerciseIdx][setIdx] */
  allSets: SetLog[][];
  /** Per-session exercise overrides (slot-index → swapped Exercise). Ne persistira se u DB queue. */
  exerciseOverrides: Record<number, Exercise>;
  /** Globalna pauza (zamrzava elapsed i rest tajmer) */
  paused: boolean;
  /** Rest ekran aktivan */
  resting: boolean;
  /** Preostalo vreme odmora u sekundama */
  restTime: number;
  /** Dijalozi */
  fatigueDialogOpen: boolean;
  /**
   * Fatigue dijalog je rešen u ovom mount-u (odgovor ILI X dismiss).
   * P0 bugfix: bez ovoga auto-open effect u ActiveWorkout ponovo otvara
   * dijalog čim se zatvori, jer se `status.bio` ne osveži sinhrono — korisnica
   * ostaje zaglavljena u petlji. Resolved blokira reopen do sledećeg mount-a.
   */
  fatigueDialogResolved: boolean;
  showExitConfirm: boolean;
  showSwapSheet: boolean;
}

export type WorkoutAction =
  | { type: "INIT_SETS"; slots: ActiveWorkoutSlot[] }
  | { type: "UPDATE_SET"; setIdx: number; field: "weight" | "reps"; delta: number }
  | { type: "SET_SET_VALUE"; setIdx: number; field: "weight" | "reps"; value: number }
  | { type: "COMPLETE_SET"; setIdx: number; restSeconds: number }
  | { type: "SKIP_REST" }
  | { type: "REST_TICK" }
  | { type: "TOGGLE_PAUSED" }
  | { type: "SET_PAUSED"; paused: boolean }
  | { type: "SWAP_EXERCISE"; exercise: Exercise }
  | { type: "SET_FATIGUE_DIALOG"; open: boolean }
  | { type: "SET_EXIT_CONFIRM"; open: boolean }
  | { type: "SET_SWAP_SHEET"; open: boolean };

/** Parse targetReps "8-12" → top of range (broji se kao cilj) */
export function parseRepTarget(targetReps: string | undefined): number {
  if (!targetReps) return 10;
  const parts = targetReps.split("-").map((s) => Number(s.trim()));
  if (parts.length === 2 && !Number.isNaN(parts[1])) return parts[1];
  if (!Number.isNaN(parts[0])) return parts[0];
  return 10;
}

/** Broj serija iz slot.finalSets, pa setsRange.min, pa fallback 3 */
export function resolveSetsCount(slot: ActiveWorkoutSlot): number {
  if (slot.finalSets && slot.finalSets > 0) return slot.finalSets;
  if (slot.setsRange && slot.setsRange[0] > 0) return slot.setsRange[0];
  return 3;
}

const initialState: WorkoutState = {
  exerciseIdx: 0,
  allSets: [],
  exerciseOverrides: {},
  paused: false,
  resting: false,
  restTime: 0,
  fatigueDialogOpen: false,
  fatigueDialogResolved: false,
  showExitConfirm: false,
  showSwapSheet: false,
};

/** Imutabilna kopija allSets matrice */
function cloneSets(allSets: SetLog[][]): SetLog[][] {
  return allSets.map((ex) => ex.map((s) => ({ ...s })));
}

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case "INIT_SETS":
      return {
        ...state,
        exerciseIdx: 0,
        allSets: action.slots.map((slot) => {
          const count = resolveSetsCount(slot);
          const reps = parseRepTarget(slot.targetReps);
          const weight = slot.targetWeight ?? 0;
          return Array.from({ length: count }, () => ({
            weight,
            reps,
            rir: slot.targetRIR ?? null,
            done: false,
          }));
        }),
      };

    case "UPDATE_SET": {
      const copy = cloneSets(state.allSets);
      const set = copy[state.exerciseIdx]?.[action.setIdx];
      if (!set) return state;
      set[action.field] = Math.max(0, set[action.field] + action.delta);
      return { ...state, allSets: copy };
    }

    case "SET_SET_VALUE": {
      const copy = cloneSets(state.allSets);
      const set = copy[state.exerciseIdx]?.[action.setIdx];
      if (!set) return state;
      set[action.field] = Math.max(0, action.value);
      return { ...state, allSets: copy };
    }

    case "COMPLETE_SET": {
      const copy = cloneSets(state.allSets);
      const set = copy[state.exerciseIdx]?.[action.setIdx];
      if (!set) return state;
      set.done = true;

      const remaining = copy[state.exerciseIdx].filter((s) => !s.done).length;
      if (remaining === 0) {
        // Poslednja serija ove vežbe
        if (state.exerciseIdx >= state.allSets.length - 1) {
          // Poslednja vežba u treningu → finish handluje stranica (handleFinishWorkout)
          return { ...state, allSets: copy };
        }
        // Pređi na sledeću vežbu uz rest ekran
        return {
          ...state,
          allSets: copy,
          restTime: action.restSeconds,
          resting: true,
          exerciseIdx: state.exerciseIdx + 1,
        };
      }
      return { ...state, allSets: copy, restTime: action.restSeconds, resting: true };
    }

    case "SKIP_REST":
      return { ...state, resting: false, restTime: 0 };

    case "REST_TICK": {
      if (!state.resting) return state;
      const next = state.restTime - 1;
      if (next <= 0) return { ...state, resting: false, restTime: 0 };
      return { ...state, restTime: next };
    }

    case "TOGGLE_PAUSED":
      return { ...state, paused: !state.paused };

    case "SET_PAUSED":
      return { ...state, paused: action.paused };

    case "SWAP_EXERCISE":
      return {
        ...state,
        exerciseOverrides: {
          ...state.exerciseOverrides,
          [state.exerciseIdx]: action.exercise,
        },
      };

    case "SET_FATIGUE_DIALOG":
      // Svako zatvaranje (odgovor ili X) markira resolved — dijalog se
      // auto-otvara najviše jednom po mount-u.
      return action.open
        ? { ...state, fatigueDialogOpen: true }
        : { ...state, fatigueDialogOpen: false, fatigueDialogResolved: true };

    case "SET_EXIT_CONFIRM":
      return { ...state, showExitConfirm: action.open };

    case "SET_SWAP_SHEET":
      return { ...state, showSwapSheet: action.open };

    default:
      return state;
  }
}

/**
 * Konsolidovano stanje aktivnog treninga.
 * Inicijalizuje allSets kada slotovi stignu iz React Query cache-a.
 */
export function useWorkoutState(slots: ActiveWorkoutSlot[]) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);

  // Inicijalizuj allSets kad podaci stignu (slots referenca je stabilna
  // jer dolazi iz React Query cache-a).
  useEffect(() => {
    if (slots.length === 0) return;
    dispatch({ type: "INIT_SETS", slots });
  }, [slots]);

  return { state, dispatch };
}
