// ============================================================================
// decayCalculator — Partition-specific Decay tajmer
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 7.5 (Handling Life Events)
//       + Sekcija 5 Korak 6 (Loading sa Decay)
// ============================================================================
//
// Klijentkinja ne dolazi sa kalendarom — biologija ne zna za ponedeljak.
// Ali kad dodje na trening, biomechnical state zavisi od KOLIKO DANA je
// proslo OD POSLEDNJEG TRENINGA ISTE PARTICIJE (ne bilo kog).
//
// Pravilo (Sekcija 7.5):
//   0–3 dana → PROGRESS    (težina ↑, volume normalan)
//   4–7 dana → MAINTAIN    (težina = , volume normalan)
//   8+ dana → MINI_DELOAD  (težina ↓20%, volume ↓50% ako Return from Break)
//
// Return from Break: kada se uvodi MINI_DELOAD posle pauze >7 dana, aktivira
// se countdown 2 (sledeće 2 sesije te particije rade -50% volume + -20% težina).
// ============================================================================

import type { LoadingMode, Partition } from '@/types/training';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const PROGRESS_MAX_DAYS = 3;        // 0–3 dana → PROGRESS
const MAINTAIN_MAX_DAYS = 7;        // 4–7 dana → MAINTAIN
// 8+ dana → MINI_DELOAD

const RETURN_FROM_BREAK_SESSIONS = 2;  // broj laganijh sesija po particiji

export interface DecayInputs {
  partition: Partition;
  partitionLastSeen?: { date: Date; sessionId: string };
  today: Date;
  returnFromBreakCountdown: number;   // za ovu particiju (0 ako nije aktivan)
}

export interface DecayOutput {
  loadingMode: LoadingMode;
  daysSince: number | null;            // null ako nikad nije bilo treninga ove particije
  shouldActivateReturnFromBreak: boolean; // true ako ovo aktivira countdown
}

// ============================================================================
// calcDecay — vraca loading mode za sledecu sesiju ove particije
// ============================================================================

export function calcDecay(input: DecayInputs): DecayOutput {
  const lastSeen = input.partitionLastSeen;
  const daysSince = lastSeen
    ? Math.floor((input.today.getTime() - lastSeen.date.getTime()) / MS_PER_DAY)
    : null;

  // Edge case: prvi trening ove particije — defaultno PROGRESS
  if (daysSince === null) {
    return {
      loadingMode: 'PROGRESS',
      daysSince: null,
      shouldActivateReturnFromBreak: false,
    };
  }

  // Edge case: vec aktivan Return from Break countdown — ostaje MINI_DELOAD
  // dok countdown ne dostigne 0
  if (input.returnFromBreakCountdown > 0) {
    return {
      loadingMode: 'MINI_DELOAD',
      daysSince,
      shouldActivateReturnFromBreak: false,
    };
  }

  // Standardni Decay
  let loadingMode: LoadingMode;
  let shouldActivateReturnFromBreak = false;

  if (daysSince <= PROGRESS_MAX_DAYS) {
    loadingMode = 'PROGRESS';
  } else if (daysSince <= MAINTAIN_MAX_DAYS) {
    loadingMode = 'MAINTAIN';
  } else {
    loadingMode = 'MINI_DELOAD';
    shouldActivateReturnFromBreak = true;  // pauza >7 dana aktivira protocol
  }

  return { loadingMode, daysSince, shouldActivateReturnFromBreak };
}

// ============================================================================
// nextCountdownAfterSession — sta postaje countdown posle završene sesije
// ============================================================================
//
// Ako je sesija pokrenuta dok je countdown=2, posle nje je 1.
// Kad dostigne 0, sledeća sesija ide u PROGRESS mode.

export function nextCountdownAfterSession(currentCountdown: number): number {
  return Math.max(0, currentCountdown - 1);
}

// ============================================================================
// initialReturnFromBreakCountdown — pocetna vrednost kad se aktivira
// ============================================================================

export const RETURN_FROM_BREAK_INITIAL_COUNTDOWN = RETURN_FROM_BREAK_SESSIONS;
