// ============================================================================
// strengthTrend — agregator nad exercise_progress (pocetnici.md §3.9)
// ============================================================================
//
// Analiza nedeljnih total volume-a (sum of weight_kg × reps) — ne maksimum
// jer je on volatilan između RPE faza. Volume je robusniji indikator
// da li je klijentkinja zaista jača ili samo loš dan.
//
// Klasifikacija:
//   rising  — najnoviji week volume > prethodni × (1 + RISE_THRESHOLD)
//   falling — najnoviji week volume < prethodni × (1 - FALL_THRESHOLD)
//   stable  — između (uključuje slučaj nedovoljno podataka)
//
// Pure funkcija. Ne dira DB — prima već izvučen niz set-ova.
// ============================================================================

export const RISE_THRESHOLD = 0.03;   // +3% vs prethodna nedelja = rising
export const FALL_THRESHOLD = 0.05;   // -5% vs prethodna nedelja = falling

export interface ExerciseSet {
  completedAt: Date;        // ili ISO string konvertovan na Date pre poziva
  weightKg: number;
  reps: number;
}

export type StrengthTrend = 'rising' | 'stable' | 'falling';

export interface StrengthTrendResult {
  trend: StrengthTrend;
  currentWeekVolume: number;
  previousWeekVolume: number;
  pctChange: number;        // negativan ako je pad
  notes: string[];
}

// ============================================================================
// computeStrengthTrend — uzima poslednje 14 dana set-ova
// ============================================================================

export function computeStrengthTrend(
  sets: ExerciseSet[],
  now: Date = new Date(),
): StrengthTrendResult {
  if (sets.length === 0) {
    return {
      trend: 'stable',
      currentWeekVolume: 0,
      previousWeekVolume: 0,
      pctChange: 0,
      notes: ['Nema podataka o trening setovima — default trend "stable".'],
    };
  }

  const MS_PER_DAY = 86_400_000;
  const dayCutoffNow = now.getTime();
  const dayCutoff7 = dayCutoffNow - 7 * MS_PER_DAY;
  const dayCutoff14 = dayCutoffNow - 14 * MS_PER_DAY;

  let currentWeekVolume = 0;
  let previousWeekVolume = 0;

  for (const s of sets) {
    const t = s.completedAt.getTime();
    const volume = s.weightKg * s.reps;
    if (t > dayCutoff7 && t <= dayCutoffNow) {
      currentWeekVolume += volume;
    } else if (t > dayCutoff14 && t <= dayCutoff7) {
      previousWeekVolume += volume;
    }
  }

  if (previousWeekVolume === 0) {
    return {
      trend: 'stable',
      currentWeekVolume,
      previousWeekVolume: 0,
      pctChange: 0,
      notes: ['Nedovoljno istorije (prethodna nedelja prazna) — default "stable".'],
    };
  }

  const pctChange = (currentWeekVolume - previousWeekVolume) / previousWeekVolume;
  let trend: StrengthTrend = 'stable';
  if (pctChange > RISE_THRESHOLD) trend = 'rising';
  else if (pctChange < -FALL_THRESHOLD) trend = 'falling';

  return {
    trend,
    currentWeekVolume: Math.round(currentWeekVolume),
    previousWeekVolume: Math.round(previousWeekVolume),
    pctChange: Math.round(pctChange * 1000) / 10,  // npr. 5.7 (%)
    notes: [
      `Trend "${trend}": current=${Math.round(currentWeekVolume)}kg, ` +
      `prev=${Math.round(previousWeekVolume)}kg, change=${(pctChange * 100).toFixed(1)}%.`,
    ],
  };
}
