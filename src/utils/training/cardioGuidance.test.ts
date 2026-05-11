import { describe, it, expect } from 'vitest';
import { computeCardioGuidance, isHiitExercise } from './cardioGuidance';

const NOW = new Date('2026-05-08T12:00:00Z');
const weeksAgo = (n: number) => new Date(NOW.getTime() - n * 7 * 86_400_000);

describe('computeCardioGuidance — pocetnici.md §2.6', () => {
  it('Beginner u 1. nedelji → HIIT BLOKIRAN', () => {
    const r = computeCardioGuidance({
      experienceLevel: 'beginner',
      onboardingDate: weeksAgo(1),
      today: NOW,
    });
    expect(r.hiitAllowed).toBe(false);
    expect(r.hiitBlockedReason).toContain('12 nedelja');
  });

  it('Beginner u 12. nedelji → HIIT odblokiran', () => {
    const r = computeCardioGuidance({
      experienceLevel: 'beginner',
      onboardingDate: weeksAgo(12),
      today: NOW,
    });
    expect(r.hiitAllowed).toBe(true);
  });

  it('Intermediate od dana 1 → HIIT dozvoljen', () => {
    const r = computeCardioGuidance({
      experienceLevel: 'intermediate',
      onboardingDate: weeksAgo(0),
      today: NOW,
    });
    expect(r.hiitAllowed).toBe(true);
  });

  it('LISS preporuka: 2-3x nedeljno, 30-45 min, 60-70% HRmax', () => {
    const r = computeCardioGuidance({
      experienceLevel: 'beginner',
      onboardingDate: weeksAgo(2),
      today: NOW,
    });
    expect(r.liss.recommended).toBe(true);
    expect(r.liss.sessionsPerWeek).toEqual({ min: 2, max: 3 });
    expect(r.liss.durationMinutes).toEqual({ min: 30, max: 45 });
    expect(r.liss.examples.length).toBeGreaterThan(0);
  });
});

describe('isHiitExercise', () => {
  it('movementPattern cardio_hiit → true', () => {
    expect(isHiitExercise({ movementPattern: 'cardio_hiit' })).toBe(true);
  });

  it('tag sa HIIT → true', () => {
    expect(isHiitExercise({ tags: ['hiit', 'circuit'] })).toBe(true);
  });

  it('regular compound → false', () => {
    expect(isHiitExercise({ movementPattern: 'knee_dominant' })).toBe(false);
  });
});
