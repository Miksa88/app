// ============================================================================
// useExercises adapter — unit tests
// Validira mapping DB Exercise → UI ExerciseItem (W-1 wire-up).
// ============================================================================

import { describe, it, expect } from 'vitest';
import { exerciseToItem } from './useExercises';
import type { Exercise } from '@/types/training';

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 12345,
    name: 'Barbell Squat',
    nameSr: 'Čučanj sa šipkom',
    isSystemExercise: true,
    createdByTrainerId: null,
    movementPattern: 'knee_dominant',
    primaryMuscle: 'quads',
    secondaryMuscles: [],
    tensionProfile: 'mid_range',
    cnsLoad: 4,
    fatigueIndex: 4,
    equipment: ['barbell', 'rack'],
    difficulty: 'intermediate',
    requiresStabilization: true,
    contraindications: [],
    gentleOn: [],
    weightIncrement: 2.5,
    isBilateral: true,
    videoUrl: null,
    instructions: 'Spusti se do paralelne pozicije.',
    isGluteBuilder: false,
    isCompound: true,
    isFinisherEligible: false,
    ...overrides,
  };
}

describe('exerciseToItem (adapter)', () => {
  it('mapira knee_dominant + quads + beginner_safe → Noge / Kvadricepsi / beginner', () => {
    const ex = makeExercise({
      movementPattern: 'knee_dominant',
      primaryMuscle: 'quads',
      difficulty: 'beginner_safe',
    });

    const item = exerciseToItem(ex);

    expect(item.category).toBe('Noge');
    expect(item.subcategory).toBe('Kvadricepsi');
    expect(item.difficulty).toBe('beginner');
  });

  it('koristi nameSr (srpski) kad je prisutan, ne name (engleski)', () => {
    const item = exerciseToItem(
      makeExercise({ name: 'Barbell Squat', nameSr: 'Čučanj sa šipkom' }),
    );
    expect(item.name).toBe('Čučanj sa šipkom');
  });

  it('fallback na name (engleski) kad je nameSr prazan', () => {
    const item = exerciseToItem(
      makeExercise({ name: 'Hip Thrust', nameSr: '' }),
    );
    expect(item.name).toBe('Hip Thrust');
  });

  it('mapira hip_dominant + glutes → Noge / Gluteus', () => {
    const item = exerciseToItem(
      makeExercise({ movementPattern: 'hip_dominant', primaryMuscle: 'glutes' }),
    );
    expect(item.category).toBe('Noge');
    expect(item.subcategory).toBe('Gluteus');
  });

  it('mapira horizontal_push + chest → Grudi / Srednji deo', () => {
    const item = exerciseToItem(
      makeExercise({
        movementPattern: 'horizontal_push',
        primaryMuscle: 'chest',
      }),
    );
    expect(item.category).toBe('Grudi');
    expect(item.subcategory).toBe('Srednji deo');
  });

  it('mapira vertical_pull + back_lats → Leđa / Latisimus', () => {
    const item = exerciseToItem(
      makeExercise({
        movementPattern: 'vertical_pull',
        primaryMuscle: 'back_lats',
      }),
    );
    expect(item.category).toBe('Leđa');
    expect(item.subcategory).toBe('Latisimus');
  });

  it('mapira isolation_lateral_delt + shoulders_side → Ramena / Bočni delt', () => {
    const item = exerciseToItem(
      makeExercise({
        movementPattern: 'isolation_lateral_delt',
        primaryMuscle: 'shoulders_side',
      }),
    );
    expect(item.category).toBe('Ramena');
    expect(item.subcategory).toBe('Bočni delt');
  });

  it('mapira isolation_biceps + biceps → Ruke / Biceps', () => {
    const item = exerciseToItem(
      makeExercise({
        movementPattern: 'isolation_biceps',
        primaryMuscle: 'biceps',
      }),
    );
    expect(item.category).toBe('Ruke');
    expect(item.subcategory).toBe('Biceps');
  });

  it('mapira core_antirotation + core → Core / Trbušnjaci', () => {
    const item = exerciseToItem(
      makeExercise({
        movementPattern: 'core_antirotation',
        primaryMuscle: 'core',
      }),
    );
    expect(item.category).toBe('Core');
    expect(item.subcategory).toBe('Trbušnjaci');
  });

  it('mapira cardio_hiit + full_body → Kardio / Funkcionalni', () => {
    const item = exerciseToItem(
      makeExercise({
        movementPattern: 'cardio_hiit',
        primaryMuscle: 'full_body',
      }),
    );
    expect(item.category).toBe('Kardio');
    expect(item.subcategory).toBe('Funkcionalni');
  });

  it('mapira carry + full_body → Full Body / Funkcionalni', () => {
    const item = exerciseToItem(
      makeExercise({
        movementPattern: 'carry',
        primaryMuscle: 'full_body',
      }),
    );
    expect(item.category).toBe('Full Body');
    expect(item.subcategory).toBe('Funkcionalni');
  });

  it('zadržava intermediate i advanced difficulty as-is', () => {
    expect(
      exerciseToItem(makeExercise({ difficulty: 'intermediate' })).difficulty,
    ).toBe('intermediate');
    expect(
      exerciseToItem(makeExercise({ difficulty: 'advanced' })).difficulty,
    ).toBe('advanced');
  });

  it('pass-through equipment i instructions', () => {
    const item = exerciseToItem(
      makeExercise({
        equipment: ['barbell', 'rack'],
        instructions: 'Test instr',
      }),
    );
    expect(item.equipment).toEqual(['barbell', 'rack']);
    expect(item.instructions).toBe('Test instr');
  });

  it('defaultVideoUrl je uvek prazan string', () => {
    const item = exerciseToItem(makeExercise({}));
    expect(item.defaultVideoUrl).toBe('');
  });

  it('videoUrl pass-through (može biti null)', () => {
    expect(exerciseToItem(makeExercise({ videoUrl: null })).videoUrl).toBeNull();
    expect(
      exerciseToItem(makeExercise({ videoUrl: 'https://x/y.mp4' })).videoUrl,
    ).toBe('https://x/y.mp4');
  });
});
