import { describe, it, expect } from 'vitest';
import {
  shouldTriggerRefeed,
  applyRefeedDay,
  REFEED_CARBS_INCREASE_PCT,
  REFEED_FATS_DECREASE_PCT,
} from './emergencyRefeed';

describe('shouldTriggerRefeed — pocetnici.md §5.1', () => {
  it('Manje od 2 dana podataka → ne triggeruje', () => {
    const r = shouldTriggerRefeed([
      { date: '2026-05-08', energyLevel: 2, sleepHours: 5, pumpScore: 3, moodScore: 2 },
    ]);
    expect(r.shouldTrigger).toBe(false);
    expect(r.reason).toContain('Nedovoljno');
  });

  it('2 dana zaredom sa 3/4 markera u zoni → TRIGGER', () => {
    const r = shouldTriggerRefeed([
      { date: '2026-05-07', energyLevel: 2, sleepHours: 5, pumpScore: 3, moodScore: 6 },
      { date: '2026-05-08', energyLevel: 3, sleepHours: 5.5, pumpScore: 2, moodScore: 7 },
    ]);
    expect(r.shouldTrigger).toBe(true);
    expect(r.flaggedDays).toEqual(['2026-05-08', '2026-05-07']);
  });

  it('Samo 1 dan flagged → ne triggeruje', () => {
    const r = shouldTriggerRefeed([
      { date: '2026-05-07', energyLevel: 7, sleepHours: 8, pumpScore: 8, moodScore: 7 },
      { date: '2026-05-08', energyLevel: 2, sleepHours: 5, pumpScore: 3, moodScore: 2 },
    ]);
    expect(r.shouldTrigger).toBe(false);
  });

  it('Sva 4 markera dobra → ne triggeruje', () => {
    const r = shouldTriggerRefeed([
      { date: '2026-05-07', energyLevel: 8, sleepHours: 7, pumpScore: 8, moodScore: 8 },
      { date: '2026-05-08', energyLevel: 9, sleepHours: 8, pumpScore: 9, moodScore: 9 },
    ]);
    expect(r.shouldTrigger).toBe(false);
  });

  it('Pump null (rest dan) — koristi 3 markera, 2/3 trigger', () => {
    const r = shouldTriggerRefeed([
      { date: '2026-05-07', energyLevel: 2, sleepHours: 5, pumpScore: null, moodScore: 6 },
      { date: '2026-05-08', energyLevel: 3, sleepHours: 5, pumpScore: null, moodScore: 7 },
    ]);
    expect(r.shouldTrigger).toBe(true);
  });

  it('Sortira po datumu — uzima poslednja 2 dana', () => {
    const r = shouldTriggerRefeed([
      { date: '2026-05-01', energyLevel: 9, sleepHours: 8, pumpScore: 9, moodScore: 9 },
      { date: '2026-05-08', energyLevel: 2, sleepHours: 5, pumpScore: 2, moodScore: 3 },
      { date: '2026-05-07', energyLevel: 3, sleepHours: 5, pumpScore: 3, moodScore: 2 },
    ]);
    expect(r.shouldTrigger).toBe(true);
  });
});

describe('applyRefeedDay — refeed makro override', () => {
  it('Carbs +50%, fats -40%, protein nepromenjen', () => {
    const r = applyRefeedDay({ proteinG: 130, carbsG: 230, fatG: 60 });
    expect(r.macros.proteinG).toBe(130);
    expect(r.macros.carbsG).toBe(Math.round(230 * (1 + REFEED_CARBS_INCREASE_PCT)));
    expect(r.macros.fatG).toBe(Math.round(60 * (1 - REFEED_FATS_DECREASE_PCT)));
  });

  it('Total kalorije: ~+150-200 kcal više od baseline-a', () => {
    const baseline = 130 * 4 + 230 * 4 + 60 * 9; // 130*4=520, 230*4=920, 60*9=540 = 1980
    const r = applyRefeedDay({ proteinG: 130, carbsG: 230, fatG: 60 });
    // +115g carbs (115*4=460 kcal) + (-24g fat × 9 = -216 kcal) = +244 kcal net
    expect(r.totalCalories).toBeGreaterThan(baseline);
  });

  it('Notes uključuju upozorenje za sledeći dan', () => {
    const r = applyRefeedDay({ proteinG: 130, carbsG: 230, fatG: 60 });
    expect(r.notes.some(n => n.toLowerCase().includes('sutra'))).toBe(true);
    expect(r.notes.some(n => n.toLowerCase().includes('izbegni'))).toBe(true);
  });
});
