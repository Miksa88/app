// ============================================================================
// weightTrend — agregator nad weight_logs (pocetnici.md §3.9)
// ============================================================================
//
// Koristi 7-dnevni moving average umesto sirovog skoka — vaga oscilira ±1kg
// dnevno usled vode/glikogena/menstrualnog ciklusa, pa MA filtrira šum.
//
// Uvek poredi MA iz poslednje nedelje sa MA iz nedelje pre nje.
// Ako nedostaje 7-dnevni window u prethodnoj nedelji → vraća null
// (decideSmartCutAction tretira null kao maintain).
// ============================================================================

export interface WeightLogEntry {
  loggedAt: Date;
  weightKg: number;
}

export interface WeightTrendResult {
  weightChangePctLast7Days: number | null;  // npr. 0.6 = +0.6%, -0.4 = pad
  currentWeekAvg: number | null;
  previousWeekAvg: number | null;
  notes: string[];
}

const MS_PER_DAY = 86_400_000;

// ============================================================================
// computeWeightTrend
// ============================================================================

export function computeWeightTrend(
  logs: WeightLogEntry[],
  now: Date = new Date(),
): WeightTrendResult {
  if (logs.length < 2) {
    return {
      weightChangePctLast7Days: null,
      currentWeekAvg: null,
      previousWeekAvg: null,
      notes: ['Nedovoljno weight_logs unosa za trend (potrebno barem 2 dana).'],
    };
  }

  const cutoffNow = now.getTime();
  const cutoff7 = cutoffNow - 7 * MS_PER_DAY;
  const cutoff14 = cutoffNow - 14 * MS_PER_DAY;

  const currentWeek: number[] = [];
  const previousWeek: number[] = [];

  for (const log of logs) {
    const t = log.loggedAt.getTime();
    if (t > cutoff7 && t <= cutoffNow) currentWeek.push(log.weightKg);
    else if (t > cutoff14 && t <= cutoff7) previousWeek.push(log.weightKg);
  }

  if (currentWeek.length === 0 || previousWeek.length === 0) {
    return {
      weightChangePctLast7Days: null,
      currentWeekAvg: avg(currentWeek),
      previousWeekAvg: avg(previousWeek),
      notes: [
        'Nedovoljno data points (jedna od dve nedelje je prazna). ' +
        'Vraćeno null — decideSmartCutAction tretira kao maintain.',
      ],
    };
  }

  const currentWeekAvg = avg(currentWeek)!;
  const previousWeekAvg = avg(previousWeek)!;
  const pctChange = ((currentWeekAvg - previousWeekAvg) / previousWeekAvg) * 100;

  return {
    weightChangePctLast7Days: Math.round(pctChange * 100) / 100,  // 2 decimale
    currentWeekAvg: Math.round(currentWeekAvg * 10) / 10,
    previousWeekAvg: Math.round(previousWeekAvg * 10) / 10,
    notes: [
      `Weight trend: ${pctChange.toFixed(2)}% ` +
      `(${currentWeekAvg.toFixed(1)}kg vs prev ${previousWeekAvg.toFixed(1)}kg).`,
    ],
  };
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}
