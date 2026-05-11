// ============================================================================
// pocetniciAlerts — §8 Crveni indikatori (pocetnici.md)
// ============================================================================
//
// Pure derivation funkcija koja iz UserStatus + recent sets/check-ins detektuje
// crvene indikatore propisane u pocetnici.md §8:
//
//   1. Izostanak ciklusa (>1 nedelje pomeren) → STOP Overreach + Refeed +10% kcal
//   2. Pad snage 2+ treninga zaredom → Hitan Deload
//   3. Loš san 3+ noći (<6h) → Volumen -30%, +50% carbs Obrok 5
//   4. 3+ prestupa u ishrani nedeljno → Plan preagresivan, +10% kcal
//   5. "Ne mogu više" (klijentkinja sama prijavi) → Razgovor required
//
// Vraća listu aktivnih alert-a sa actionable suggestion-ima koje trener (ili
// auto-handler) može da primeni. Trenutno koristi proxy podatke koji već
// postoje u UserStatus (recoveryMultiplier, redFlags counter-i).
// ============================================================================

import type { UserStatus } from '@/types/userStatus';

export type AlertSeverity = 'red' | 'amber';

export interface PocetniciAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  recommendedActions: string[];
}

export interface DetectAlertsInput {
  status: UserStatus;
  // Recent window data (proširivo kad budu data sources gotovi)
  consecutiveFailedSessions?: number;     // iz queue history
  lowSleepNightsLast7Days?: number;       // iz daily_check_ins
  mealBreachesLast7Days?: number;         // iz meal_logs
  cycleMissedDaysPastExpected?: number;   // iz cycle tracker
  selfReportedExhaustion?: boolean;       // iz check-in notes ili button
}

// ============================================================================

export function detectPocetniciAlerts(input: DetectAlertsInput): PocetniciAlert[] {
  const alerts: PocetniciAlert[] = [];

  // 1. Cycle missed >7 dana (§8 + §6.1)
  if (input.cycleMissedDaysPastExpected !== undefined &&
      input.cycleMissedDaysPastExpected > 7) {
    alerts.push({
      id: 'cycle_missed',
      severity: 'red',
      title: 'Izostanak ciklusa',
      description: `Klijentkinja kasni ${input.cycleMissedDaysPastExpected} dana. Hormonski signal.`,
      recommendedActions: [
        'STOP Overreach faza',
        'Refeed dan + 10% kcal podizanje 2 nedelje',
        'Volumen treninga -30%',
        'Razgovor o stresu i deficitu',
      ],
    });
  }

  // 2. Pad snage 2+ treninga zaredom (§8 + redFlags.consecutiveFailedWorkouts)
  const failedSessions = input.consecutiveFailedSessions ??
    input.status.redFlags.consecutiveFailedWorkouts;
  if (failedSessions >= 2) {
    alerts.push({
      id: 'strength_drop',
      severity: 'red',
      title: 'Pad snage 2+ treninga',
      description: `Snaga pala u ${failedSessions} uzastopne sesije.`,
      recommendedActions: [
        'Hitan Deload (RPE 5-6, volumen 50%)',
        'Pregled biofeedback-a (san, stres, ciklus)',
        'Razmotri Emergency Refeed sutra',
      ],
    });
  }

  // 3. Loš san 3+ noći (§8)
  if (input.lowSleepNightsLast7Days !== undefined &&
      input.lowSleepNightsLast7Days >= 3) {
    alerts.push({
      id: 'poor_sleep',
      severity: 'amber',
      title: `${input.lowSleepNightsLast7Days} noći ispod 6h sna`,
      description: 'Recovery kapacitet kompromitovan.',
      recommendedActions: [
        'Volumen treninga -30%',
        '+50% hidrata u Obrok 5 (triptofan → serotonin → melatonin)',
        'Magnesium Bisglicinat 300-400mg pre spavanja',
      ],
    });
  }

  // 4. 3+ prestupa u ishrani (§8 + skipCount proxy)
  const breaches = input.mealBreachesLast7Days ?? input.status.redFlags.skipCount7d;
  if (breaches >= 3) {
    alerts.push({
      id: 'meal_breaches',
      severity: 'amber',
      title: `${breaches} prestupa u ishrani nedeljno`,
      description: 'Plan je verovatno preagresivan ili stresan.',
      recommendedActions: [
        '+10% kcal (ublaži deficit)',
        'Razmotri Diet Break 2 nedelje ako se nastavi',
        'Razgovor — možda ED faktor (preporuka psihologa)',
      ],
    });
  }

  // 5. Self-reported exhaustion ("Ne mogu više")
  if (input.selfReportedExhaustion) {
    alerts.push({
      id: 'self_exhaustion',
      severity: 'red',
      title: '"Ne mogu više" — klijentkinja prijavila',
      description: 'Psihički zamor je realan. Algoritam nije dovoljan, trener mora razgovor.',
      recommendedActions: [
        'Direktan razgovor (telefon ili lično)',
        'Razmotri Diet Break 2 nedelje + smanjenje volumena 50%',
        'Identifikuj specifičan trigger (rad, partner, zdravlje)',
      ],
    });
  }

  return alerts;
}

// ============================================================================
// Helpers — derive recent window data iz check-ins
// ============================================================================

export interface RecentCheckInRow {
  date: string;
  sleepHours: number | null;
}

export function countLowSleepNights7d(rows: RecentCheckInRow[]): number {
  return rows.filter(r => r.sleepHours !== null && r.sleepHours < 6).length;
}
