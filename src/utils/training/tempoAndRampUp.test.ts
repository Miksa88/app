import { describe, it, expect } from 'vitest';
import {
  getDefaultTempo,
  generateRampUpSets,
  applyTempoAndRampUp,
} from './tempoAndRampUp';
import type { ExerciseSlot } from '@/types/training';

describe('getDefaultTempo — pocetnici.md §2.2.C', () => {
  it('Compound default 2-0-2-0', () => {
    expect(getDefaultTempo('knee_dominant')).toBe('2-0-2-0');
    expect(getDefaultTempo('horizontal_push')).toBe('2-0-2-0');
    expect(getDefaultTempo('vertical_pull')).toBe('2-0-2-0');
  });

  it('Hip Thrust → 2-1-2-1 (glute squeeze)', () => {
    expect(getDefaultTempo('hip_extension', 'glutes')).toBe('2-1-2-1');
  });

  it('RDL → 3-0-1-0 (stretch emphasis)', () => {
    expect(getDefaultTempo('hip_dominant')).toBe('3-0-1-0');
  });

  it('Abdukcija → 2-0-2-2 (sustained tension)', () => {
    expect(getDefaultTempo('abduction')).toBe('2-0-2-2');
  });

  it('Plank → isometric', () => {
    expect(getDefaultTempo('core_antirotation')).toBe('isometric');
  });
});

describe('generateRampUpSets — pocetnici.md §2.2.B', () => {
  it('Primary compound → 2 ramp-up setova (50% + 75%)', () => {
    const sets = generateRampUpSets({
      priority: 'primary',
      movementPattern: 'knee_dominant',
    });
    expect(sets).toHaveLength(2);
    expect(sets?.[0].weightPct).toBe(0.50);
    expect(sets?.[1].weightPct).toBe(0.75);
  });

  it('Secondary compound → 2 ramp-up setova', () => {
    const sets = generateRampUpSets({
      priority: 'secondary',
      movementPattern: 'horizontal_pull',
    });
    expect(sets).toHaveLength(2);
  });

  it('Isolation pattern bez compound → bez ramp-up-a (osim prvog)', () => {
    const sets = generateRampUpSets(
      { priority: 'isolation', movementPattern: 'isolation_lateral_delt' },
      false,  // not first
    );
    expect(sets).toBeUndefined();
  });

  it('Prvi isolation u treningu → 1 ramp-up (60%)', () => {
    const sets = generateRampUpSets(
      { priority: 'isolation', movementPattern: 'abduction' },
      true,  // first
    );
    expect(sets).toHaveLength(1);
    expect(sets?.[0].weightPct).toBe(0.60);
  });

  it('Finisher → bez ramp-up-a', () => {
    const sets = generateRampUpSets({
      priority: 'finisher',
      movementPattern: 'core_antirotation',
    });
    expect(sets).toBeUndefined();
  });
});

describe('applyTempoAndRampUp — popunjava sve slotove u danu', () => {
  it('Trening A — Leg Press primary compound dobija ramp-up', () => {
    const day = {
      exerciseSlots: [
        {
          slotIndex: 0,
          priority: 'isolation',
          movementPattern: 'core_antirotation',
          muscleGroup: 'core',
          setsRange: [1, 1],
          repRange: [12, 15],
        } as ExerciseSlot,
        {
          slotIndex: 1,
          priority: 'primary',
          movementPattern: 'knee_dominant',
          muscleGroup: 'quads',
          setsRange: [3, 3],
          repRange: [8, 12],
        } as ExerciseSlot,
        {
          slotIndex: 2,
          priority: 'isolation',
          movementPattern: 'abduction',
          muscleGroup: 'glutes_med',
          setsRange: [3, 3],
          repRange: [12, 15],
        } as ExerciseSlot,
      ],
    };

    const result = applyTempoAndRampUp(day);
    // Slot 0 (warmup) je isolation core — first isolation, dobija ramp-up
    expect(result.exerciseSlots[0].tempo).toBe('isometric');
    // Slot 1 (Leg Press) — primary compound, 2 ramp-up setova
    expect(result.exerciseSlots[1].tempo).toBe('2-0-2-0');
    expect(result.exerciseSlots[1].rampUpSets).toHaveLength(2);
    // Slot 2 (Abdukcija) — isolation ali NIJE prvi → bez ramp-up-a
    expect(result.exerciseSlots[2].tempo).toBe('2-0-2-2');
    expect(result.exerciseSlots[2].rampUpSets).toBeUndefined();
  });

  it('Ne prepisuje postojeći tempo/rampUpSets', () => {
    const day = {
      exerciseSlots: [
        {
          slotIndex: 1,
          priority: 'primary',
          movementPattern: 'knee_dominant',
          muscleGroup: 'quads',
          setsRange: [3, 3],
          repRange: [8, 12],
          tempo: '4-0-1-0',  // custom override
        } as ExerciseSlot,
      ],
    };
    const result = applyTempoAndRampUp(day);
    expect(result.exerciseSlots[0].tempo).toBe('4-0-1-0');
  });
});
