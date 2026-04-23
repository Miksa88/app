// ============================================================================
// calcMA5 — test cases za MA5 sa menstrualnim skip-om
// Spec: 02_NUTRITION_FLOW_MASTER.md §10 + 03_INTEGRATION_LAYER.md §3.2 Rule 8
// ============================================================================

import { describe, it, expect } from 'vitest';
import { calcMA5, type WeightSample } from './movingAverage';

// Helper — generiši sample sa ISO datumom dane-od-danas unazad
function sample(
  daysAgo: number,
  weightKg: number,
  cycleDayAtTime: number | null = null,
): WeightSample {
  const iso = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return { weight_kg: weightKg, logged_at: iso, cycleDayAtTime };
}

describe('calcMA5 — MA5 sa menstrualnim skip-om', () => {
  it('insufficient data: 3 non-menstrual uzoraka → ma5=null, count=3', () => {
    // Razlog: trendline zahteva barem 5 pouzdanih tačaka inače je noise
    // veći od signala. UI prikazuje "nedovoljno podataka".
    const samples: WeightSample[] = [
      sample(0, 60.0),
      sample(1, 60.5),
      sample(2, 60.2),
    ];

    const result = calcMA5(samples);

    expect(result.ma5).toBeNull();
    expect(result.reliableSampleCount).toBe(3);
  });

  it('normal: 5 non-menstrual uzoraka 60/61/60/60/59 → ma5=60.0, count=5', () => {
    // 60+61+60+60+59 = 300, /5 = 60.0
    const samples: WeightSample[] = [
      sample(0, 60.0),
      sample(1, 61.0),
      sample(2, 60.0),
      sample(3, 60.0),
      sample(4, 59.0),
    ];

    const result = calcMA5(samples);

    expect(result.ma5).toBe(60.0);
    expect(result.reliableSampleCount).toBe(5);
  });

  it('with skip: 7 uzoraka (2 u menstrualnoj 1–5) → preskoči ih, prosek 5 preostalih', () => {
    // 7 najskorijih. Prva dva su u menstrualnoj (cycleDay=1, 3) — skip.
    // Preostalih 5: 60/61/60/60/60 → prosek = 301/5 = 60.2
    const samples: WeightSample[] = [
      sample(0, 62.0, 1),   // menstrual — SKIP (edem)
      sample(1, 62.5, 3),   // menstrual — SKIP (edem)
      sample(2, 60.0, 8),
      sample(3, 61.0, 9),
      sample(4, 60.0, 10),
      sample(5, 60.0, 11),
      sample(6, 60.0, 12),
    ];

    const result = calcMA5(samples);

    expect(result.ma5).toBe(60.2);
    expect(result.reliableSampleCount).toBe(5);
  });

  it('all skip: 5 uzoraka svi sa cycleDay 1–5 → ma5=null, count=0', () => {
    // Ako sve 5 najskorijih padaju u menstrualnu fazu, nema pouzdanog
    // osnova za trend. Vrati null + count=0 da UI može prikazati
    // "sačekaj kraj menstruacije za trend".
    const samples: WeightSample[] = [
      sample(0, 62.0, 1),
      sample(1, 62.5, 2),
      sample(2, 62.7, 3),
      sample(3, 62.3, 4),
      sample(4, 61.9, 5),
    ];

    const result = calcMA5(samples);

    expect(result.ma5).toBeNull();
    expect(result.reliableSampleCount).toBe(0);
  });
});
