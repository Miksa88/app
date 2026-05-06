// ============================================================================
// redFlags — kompjuter za RedFlags sekciju trener dashboard-a
// Spec: 03_INTEGRATION_LAYER.md Sekcija 2.1 (UserStatus.redFlags) +
//       Sekcija 6.2 (Trener Dashboard RedFlagsSection)
// ============================================================================
//
// Trener vidi listu klijentkinja koje "treba paziti". Definicija "at risk":
// any of the following triggers true → isAtRisk = true.
//
// Pure funkcija — uzima trenutni UserStatus i vraca novi RedFlags subobjekat.
// ============================================================================

import type { UserStatus, UserStatusRedFlags } from '@/types/userStatus';

// ============================================================================
// Treshholds za "at risk" definiciju
// ============================================================================
//
// Ovo su BIOLOSKI granicnici. Promena vrednosti ovde je arhitektonska
// odluka — diskusija sa Mihajlom pre menjanja.

const SKIP_COUNT_7D_THRESHOLD = 3;        // > 3 propustena obroka = problem
const METABOLIC_NOISE_DAYS_THRESHOLD = 2;  // 2+ dana metabolicke buke
const ENERGY_BELOW_5_DAYS_THRESHOLD = 3;   // 3+ dana energija < 5/10
const FAILED_WORKOUTS_THRESHOLD = 2;       // 2 uzastopna failovana treninga
const DAYS_WITHOUT_WEEKLY_CHECKIN = 10;    // > 10 dana bez weekly checkin-a

// ============================================================================
// CalcRedFlagsInputs — sta funkcija prima
// ============================================================================
//
// Trenutni redFlags state IZ statusa + inkrement-i koji su se desili od
// poslednjeg poziva. Sync Engine prosledjuje brojeve (npr. da li je danas
// preskocen obrok — onda inkrementuje skipCount7d).

export interface CalcRedFlagsInputs {
  status: UserStatus;

  // Inkrement-i koji se desavaju u trenutnoj sesiji
  // (npr. processDailyCheckIn poveca skipCount ako je obrok skip-ovan danas)
  incrementSkipCount?: number;
  incrementMetabolicNoiseDays?: number;
  incrementEnergyBelowDays?: number;
  incrementConsecutiveFailedWorkouts?: number;
  resetFailedWorkouts?: boolean;            // posle uspesnog treninga

  // Weekly checkin
  weeklyCheckInJustCompleted?: boolean;
}

// ============================================================================
// calcRedFlags — main entry point
// ============================================================================

export function calcRedFlags(input: CalcRedFlagsInputs): UserStatusRedFlags {
  const current = input.status.redFlags;

  const skipCount7d = current.skipCount7d + (input.incrementSkipCount ?? 0);
  const metabolicNoiseDays7d =
    current.metabolicNoiseDays7d + (input.incrementMetabolicNoiseDays ?? 0);
  const energyBelowThreshold7d =
    current.energyBelowThreshold7d + (input.incrementEnergyBelowDays ?? 0);

  const consecutiveFailedWorkouts = input.resetFailedWorkouts
    ? 0
    : current.consecutiveFailedWorkouts + (input.incrementConsecutiveFailedWorkouts ?? 0);

  const daysSinceLastWeeklyCheckIn = input.weeklyCheckInJustCompleted
    ? 0
    : current.daysSinceLastWeeklyCheckIn + 1;

  const isAtRisk = computeIsAtRisk({
    skipCount7d,
    metabolicNoiseDays7d,
    energyBelowThreshold7d,
    consecutiveFailedWorkouts,
    daysSinceLastWeeklyCheckIn,
  });

  return {
    skipCount7d,
    metabolicNoiseDays7d,
    energyBelowThreshold7d,
    consecutiveFailedWorkouts,
    daysSinceLastWeeklyCheckIn,
    isAtRisk,
  };
}

// ============================================================================
// computeIsAtRisk — ANY of below triggers attention
// ============================================================================

function computeIsAtRisk(
  flags: Omit<UserStatusRedFlags, 'isAtRisk'>,
): boolean {
  return (
    flags.skipCount7d > SKIP_COUNT_7D_THRESHOLD ||
    flags.metabolicNoiseDays7d >= METABOLIC_NOISE_DAYS_THRESHOLD ||
    flags.energyBelowThreshold7d >= ENERGY_BELOW_5_DAYS_THRESHOLD ||
    flags.consecutiveFailedWorkouts >= FAILED_WORKOUTS_THRESHOLD ||
    flags.daysSinceLastWeeklyCheckIn > DAYS_WITHOUT_WEEKLY_CHECKIN
  );
}

// ============================================================================
// Decay 7-day rolling brojeva
// ============================================================================
//
// Skip count, metabolic noise days, energy below days su "u poslednjih 7
// dana". Sync Engine treba da ih dekrementuje na osnovu starenja podataka.
// Ova funkcija simulira dnevni rollback (zove se jednom dnevno iz cron-a).

export function decayRollingCounters(
  flags: UserStatusRedFlags,
  daysToDecay: number = 1,
): UserStatusRedFlags {
  // Konzervativan pristup: 1/7 svake metrike po danu (linearni decay)
  const skipDecayed = Math.max(0, flags.skipCount7d - Math.ceil(daysToDecay * (flags.skipCount7d / 7)));
  const noiseDecayed = Math.max(0, flags.metabolicNoiseDays7d - Math.ceil(daysToDecay * (flags.metabolicNoiseDays7d / 7)));
  const energyDecayed = Math.max(0, flags.energyBelowThreshold7d - Math.ceil(daysToDecay * (flags.energyBelowThreshold7d / 7)));

  const isAtRisk = computeIsAtRisk({
    skipCount7d: skipDecayed,
    metabolicNoiseDays7d: noiseDecayed,
    energyBelowThreshold7d: energyDecayed,
    consecutiveFailedWorkouts: flags.consecutiveFailedWorkouts,
    daysSinceLastWeeklyCheckIn: flags.daysSinceLastWeeklyCheckIn,
  });

  return {
    skipCount7d: skipDecayed,
    metabolicNoiseDays7d: noiseDecayed,
    energyBelowThreshold7d: energyDecayed,
    consecutiveFailedWorkouts: flags.consecutiveFailedWorkouts,
    daysSinceLastWeeklyCheckIn: flags.daysSinceLastWeeklyCheckIn,
    isAtRisk,
  };
}
