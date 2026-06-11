// ============================================================================
// applyPermanentSwaps — testovi primene trajnih zamena na resolved slotove
// MVP_PRESET gap #2 — "Zameni trajno"
// ============================================================================

import { describe, it, expect } from 'vitest';
import { applyPermanentSwaps } from './applyPermanentSwaps';
import type { Exercise } from '@/types/training';

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 1,
    name: 'Test',
    nameSr: 'Test',
    isSystemExercise: true,
    createdByTrainerId: null,
    movementPattern: 'hip_dominant',
    primaryMuscle: 'glutes',
    secondaryMuscles: [],
    tensionProfile: 'mid_range',
    cnsLoad: 3,
    fatigueIndex: 3,
    equipment: ['barbell'],
    difficulty: 'intermediate',
    requiresStabilization: false,
    contraindications: [],
    gentleOn: [],
    weightIncrement: 2.5,
    isBilateral: true,
    videoUrl: null,
    instructions: '',
    isGluteBuilder: false,
    isCompound: true,
    isFinisherEligible: false,
    ...overrides,
  };
}

const library: Exercise[] = [
  makeExercise({ id: 1, name: 'Hip Thrust', nameSr: 'Hip potisak' }),
  makeExercise({ id: 2, name: 'Glute Bridge', nameSr: 'Glute most' }),
  makeExercise({ id: 3, name: 'RDL', nameSr: 'Rumunsko mrtvo' }),
];

const uuidById = new Map<number, string>([
  [1, 'uuid-1'],
  [2, 'uuid-2'],
  [3, 'uuid-3'],
]);

describe('applyPermanentSwaps', () => {
  it('zamenjuje chosenExerciseId po from→to mapi', () => {
    const swaps = new Map([['uuid-1', 'uuid-2']]);
    const slots = [{ chosenExerciseId: 1 }, { chosenExerciseId: 3 }];

    const result = applyPermanentSwaps(slots, swaps, library, uuidById);

    expect(result[0].chosenExerciseId).toBe(2);
    expect(result[1].chosenExerciseId).toBe(3); // nema zamene → netaknut
  });

  it('prazna mapa → vraća iste slotove (identity)', () => {
    const slots = [{ chosenExerciseId: 1 }];
    const result = applyPermanentSwaps(slots, new Map(), library, uuidById);
    expect(result).toBe(slots);
  });

  it('slot bez chosenExerciseId ostaje netaknut', () => {
    const swaps = new Map([['uuid-1', 'uuid-2']]);
    const slots = [{ chosenExerciseId: undefined }];
    const result = applyPermanentSwaps(slots, swaps, library, uuidById);
    expect(result[0].chosenExerciseId).toBeUndefined();
  });

  it('target vežba van library-ja → slot netaknut (safe fallback)', () => {
    const swaps = new Map([['uuid-1', 'uuid-obrisana']]);
    const slots = [{ chosenExerciseId: 1 }];
    const result = applyPermanentSwaps(slots, swaps, library, uuidById);
    expect(result[0].chosenExerciseId).toBe(1);
  });

  it('vežba bez UUID-a u mapi (degraded mode) → slot netaknut', () => {
    const swaps = new Map([['uuid-99', 'uuid-2']]);
    const slots = [{ chosenExerciseId: 99 }];
    const result = applyPermanentSwaps(slots, swaps, library, uuidById);
    expect(result[0].chosenExerciseId).toBe(99);
  });

  it('self-swap (from === to) → slot netaknut', () => {
    const swaps = new Map([['uuid-1', 'uuid-1']]);
    const slots = [{ chosenExerciseId: 1 }];
    const result = applyPermanentSwaps(slots, swaps, library, uuidById);
    expect(result[0].chosenExerciseId).toBe(1);
  });

  it('čuva ostala polja slota (targetWeight i sl.)', () => {
    const swaps = new Map([['uuid-1', 'uuid-2']]);
    const slots = [{ chosenExerciseId: 1, targetWeight: 40, slotIndex: 2 }];
    const result = applyPermanentSwaps(slots, swaps, library, uuidById);
    expect(result[0]).toEqual({ chosenExerciseId: 2, targetWeight: 40, slotIndex: 2 });
  });
});
