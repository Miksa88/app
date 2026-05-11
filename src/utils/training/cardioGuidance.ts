// ============================================================================
// cardioGuidance — pocetnici.md §2.6 Kardio i NEAT
// ============================================================================
//
// HIIT zabrana (§2.6):
//   "HIIT je ZABRANJEN prvih 12 nedelja (≈2 mezociklusa)."
//   Logika: kod početnice diže kortizol previsoko, blokira gubitak masti,
//   remeti ciklus.
//
// LISS preporuka (§2.6):
//   "Dozvoljeno: brzo hodanje, lagani bicikl, plivanje
//    Učestalost: 2-3x nedeljno, 30-45 min
//    Intenzitet: mogu da pričam (oko 60-70% HRmax)"
//
// Pure funkcije — UI i programGenerator ih čitaju za odluke i prikaze.
// ============================================================================

const HIIT_BLOCK_WEEKS = 12;
const MS_PER_DAY = 86_400_000;

export interface CardioGuidanceInput {
  experienceLevel: 'beginner' | 'intermediate';
  onboardingDate: Date;
  today?: Date;
}

export interface CardioGuidanceResult {
  hiitAllowed: boolean;
  hiitBlockedReason: string | null;
  weeksSinceOnboarding: number;

  liss: {
    recommended: boolean;
    sessionsPerWeek: { min: number; max: number };
    durationMinutes: { min: number; max: number };
    intensityNote: string;
    examples: string[];
  };
}

// ============================================================================
// computeCardioGuidance
// ============================================================================

export function computeCardioGuidance(input: CardioGuidanceInput): CardioGuidanceResult {
  const today = input.today ?? new Date();
  const weeksSince = Math.floor(
    (today.getTime() - input.onboardingDate.getTime()) / (MS_PER_DAY * 7),
  );

  let hiitAllowed = true;
  let hiitBlockedReason: string | null = null;
  if (input.experienceLevel === 'beginner' && weeksSince < HIIT_BLOCK_WEEKS) {
    hiitAllowed = false;
    hiitBlockedReason =
      `HIIT zabranjen prvih ${HIIT_BLOCK_WEEKS} nedelja za početnice — diže kortizol, ` +
      `blokira gubitak masti, remeti ciklus. Trenutno: ${weeksSince}/${HIIT_BLOCK_WEEKS} nedelja.`;
  }

  return {
    hiitAllowed,
    hiitBlockedReason,
    weeksSinceOnboarding: weeksSince,
    liss: {
      recommended: true,
      sessionsPerWeek: { min: 2, max: 3 },
      durationMinutes: { min: 30, max: 45 },
      intensityNote: '60-70% HRmax — možeš da pričaš dok hodaš/voziš.',
      examples: [
        'Brzo hodanje (4-5 km/h)',
        'Lagani bicikl (stationary ili van)',
        'Plivanje (kontinuirano, ne sprintovi)',
        'Lagani plies/eliptičan trener',
      ],
    },
  };
}

// ============================================================================
// isHiitExercise — heuristika za blokadu HIIT-a u workout-u
// ============================================================================
//
// Koristi se u programGenerator/exerciseSubstitution kad treba da se
// proveri da li exercise spada u HIIT kategoriju. Ako jeste i HIIT je
// blokiran, exercise se izuzima iz pool-a.

export function isHiitExercise(exercise: {
  movementPattern?: string;
  primaryMuscle?: string;
  tags?: string[];
}): boolean {
  if (exercise.movementPattern === 'cardio_hiit') return true;
  if (exercise.tags?.some((t) => t.toLowerCase().includes('hiit'))) return true;
  return false;
}
