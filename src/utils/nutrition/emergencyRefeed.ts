// ============================================================================
// emergencyRefeed — Hitna hormonska intervencija (pocetnici.md §5.1)
// ============================================================================
//
// Trigger uslovi (HARD RULE):
//   - 3 od 4 markera (san, pumpa, energija, raspoloženje) ≤3 dva dana zaredom
//   - ILI: hladne ruke/noge + izostanak pumpe 3+ dana → 2 dana refeed
//
// Refeed protokol (1 dan):
//   - Hidrati: +50%
//   - Proteini: nepromenjeni
//   - Masti:    -40%
//   - Vlakna:   -30% (manje povrća, više belog pirinča/krompira)
//
// Posle refeed-a → sledeći dan VRAĆANJE na standardni plan. Bez kompenzacije.
// Vaga sutra: +0.5 do +1.5 kg (voda + glikogen). Nestaje za 2-3 dana.
//
// 4 markera u daily_check_ins (posle migracije 20260508140000):
//   marker 1: energy_level ≤ 3
//   marker 2: sleep_hours < 6
//   marker 3: pump_score ≤ 3 (ako je null = nije bilo treninga, izuzima se)
//   marker 4: mood_score ≤ 3
// Trigger: 3/4 markera flagged 2 dana zaredom (pocetnici.md §5.1 hard rule).
// Ako nedostaje pump (rest dan), trigger postaje 2/3 ostalih.
// ============================================================================

export const REFEED_CARBS_INCREASE_PCT = 0.50;
export const REFEED_FATS_DECREASE_PCT = 0.40;
export const REFEED_FIBER_DECREASE_PCT = 0.30;

export interface DailyCheckInMarker {
  date: string;                  // YYYY-MM-DD
  energyLevel: number | null;    // 1-10
  sleepHours: number | null;     // 0-14
  pumpScore: number | null;      // 1-10, null ako nije bio trening
  moodScore: number | null;      // 1-10
}

export interface RefeedTriggerResult {
  shouldTrigger: boolean;
  reason: string;
  flaggedDays: string[];
}

// ============================================================================
// shouldTriggerRefeed — analiza poslednjih 2 dana check-in-a
// ============================================================================

export function shouldTriggerRefeed(
  recentCheckIns: DailyCheckInMarker[],
): RefeedTriggerResult {
  if (recentCheckIns.length < 2) {
    return {
      shouldTrigger: false,
      reason: 'Nedovoljno check-in podataka (potrebna 2 dana zaredom).',
      flaggedDays: [],
    };
  }

  const sorted = [...recentCheckIns].sort((a, b) => b.date.localeCompare(a.date));
  const lastTwo = sorted.slice(0, 2);

  const flaggedDays: string[] = [];
  for (const day of lastTwo) {
    let flagged = 0;
    let total = 0;
    if (day.energyLevel !== null) { total++; if (day.energyLevel <= 3) flagged++; }
    if (day.sleepHours !== null)  { total++; if (day.sleepHours  < 6)  flagged++; }
    if (day.pumpScore !== null)   { total++; if (day.pumpScore   <= 3) flagged++; }
    if (day.moodScore !== null)   { total++; if (day.moodScore   <= 3) flagged++; }
    // Trigger threshold: 3/4 ako je sve 4 popunjeno; 2/3 ako fali pump (rest dan);
    // 2/2 ako fale i pump i mood (minimum). Princip: većina poznatih markera u zoni rizika.
    const threshold = total >= 4 ? 3 : total >= 2 ? 2 : Infinity;
    if (flagged >= threshold) {
      flaggedDays.push(day.date);
    }
  }

  if (flaggedDays.length === 2) {
    return {
      shouldTrigger: true,
      reason: `2 dana zaredom (${flaggedDays.join(', ')}) sa ≥2/3 markera u zoni rizika. ` +
              `Pokreni Emergency Refeed (pocetnici.md §5.1).`,
      flaggedDays,
    };
  }

  return {
    shouldTrigger: false,
    reason: `Markeri stabilni (flagged dana: ${flaggedDays.length}/2 potrebnih).`,
    flaggedDays,
  };
}

// ============================================================================
// applyRefeedDay — primenjuje +50% carbs / -40% fats override na makroe
// ============================================================================

export interface RefeedMacroInput {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface RefeedMacroResult {
  macros: RefeedMacroInput;
  totalCalories: number;
  notes: string[];
}

export function applyRefeedDay(input: RefeedMacroInput): RefeedMacroResult {
  const proteinG = input.proteinG;
  const carbsG = Math.round(input.carbsG * (1 + REFEED_CARBS_INCREASE_PCT));
  const fatG = Math.round(input.fatG * (1 - REFEED_FATS_DECREASE_PCT));
  const totalCalories = Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);
  return {
    macros: { proteinG, carbsG, fatG },
    totalCalories,
    notes: [
      `Refeed dan: +${Math.round(REFEED_CARBS_INCREASE_PCT * 100)}% hidrata, ` +
      `-${Math.round(REFEED_FATS_DECREASE_PCT * 100)}% masti, ` +
      `-${Math.round(REFEED_FIBER_DECREASE_PCT * 100)}% vlakana.`,
      'Izbor hidrata: beli pirinač, krompir, banana, palačinke od ovsa, mango.',
      'IZBEGNI: integralne žitarice, mahunarke, sirovo povrće.',
      'Sutra: VRAĆANJE na standardni plan, BEZ kompenzacije.',
    ],
  };
}
