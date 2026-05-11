import { describe, it, expect } from 'vitest';
import { getMicrocycleIntensity } from './microcycleIntensity';

describe('getMicrocycleIntensity — pocetnici.md §2.1 RPE ramp', () => {
  it('Week 1 (kalibracija) — RIR 4 / RPE 6', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 0,
      totalWeeksInMesocycle: 7,
    });
    expect(r.targetRIR).toBe(4);
    expect(r.targetRPE).toBe(6);
    expect(r.phase).toBe('kalibracija');
  });

  it('Week 2 (akumulacija) — RIR 3 / RPE 7', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 1,
      totalWeeksInMesocycle: 7,
    });
    expect(r.targetRIR).toBe(3);
    expect(r.targetRPE).toBe(7);
  });

  it('Week 4 (akumulacija) — RIR 2 / RPE 8', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 3,
      totalWeeksInMesocycle: 7,
    });
    expect(r.targetRIR).toBe(2);
    expect(r.targetRPE).toBe(8);
  });

  it('Week 6 (Overreach, default) — RIR 0 / RPE 10', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 5,
      totalWeeksInMesocycle: 7,
    });
    expect(r.phase).toBe('overreach');
    expect(r.targetRIR).toBe(0);
    expect(r.targetRPE).toBe(10);
  });

  it('Week 7 (deload) — RIR 5 / RPE 5', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 6,
      totalWeeksInMesocycle: 7,
    });
    expect(r.phase).toBe('deload');
    expect(r.targetRIR).toBe(5);
  });
});

describe('getMicrocycleIntensity — Hashimoto Overreach block (pocetnici.md §1.1)', () => {
  it('Hashimoto + Overreach week → cap RIR 2 / RPE 8 (umesto 0/10)', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 5,
      totalWeeksInMesocycle: 7,
      metabolicConditions: ['hashimoto'],
    });
    expect(r.phase).toBe('overreach');
    expect(r.targetRIR).toBe(2);
    expect(r.targetRPE).toBe(8);
    expect(r.notes.some(n => n.includes('Hashimoto'))).toBe(true);
  });

  it('Hashimoto u akumulaciji (W4) — ista RIR 2 (ne menja se)', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 3,
      totalWeeksInMesocycle: 7,
      metabolicConditions: ['hashimoto'],
    });
    expect(r.targetRIR).toBe(2);
    expect(r.phase).toBe('akumulacija');
  });

  it('Bez metabolickih uslova → standardni Overreach (RIR 0)', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 5,
      totalWeeksInMesocycle: 7,
      metabolicConditions: [],
    });
    expect(r.targetRIR).toBe(0);
  });

  it('PCOS bez hashimoto → standardni Overreach (RIR 0)', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 5,
      totalWeeksInMesocycle: 7,
      metabolicConditions: ['pcos'],
    });
    expect(r.targetRIR).toBe(0);
  });
});

describe('getMicrocycleIntensity — Intermediate Mixed/Undulating (SREDNJE_NAPREDNE_V2 §2.1)', () => {
  it('W1 Intro — RIR 3 / RPE 7 / volumen 100%', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 0,
      totalWeeksInMesocycle: 6,
      experienceLevel: 'intermediate',
    });
    expect(r.targetRIR).toBe(3);
    expect(r.targetRPE).toBe(7);
    expect(r.phase).toBe('kalibracija');
    expect(r.volumeMultiplier).toBe(1.0);
  });

  it('W2 Akumulacija (volumen) — RIR 2 / RPE 8 / volumen 110%', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 1,
      totalWeeksInMesocycle: 6,
      experienceLevel: 'intermediate',
    });
    expect(r.targetRIR).toBe(2);
    expect(r.targetRPE).toBe(8);
    expect(r.volumeMultiplier).toBe(1.1);
  });

  it('W3 Akumulacija (intenzitet) — RIR 1 / RPE 9 / volumen 100%', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 2,
      totalWeeksInMesocycle: 6,
      experienceLevel: 'intermediate',
    });
    expect(r.targetRIR).toBe(1);
    expect(r.targetRPE).toBe(9);
    expect(r.volumeMultiplier).toBe(1.0);
  });

  it('W4 Akumulacija (volumen peak) — RIR 2 / RPE 8 / volumen 115%', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 3,
      totalWeeksInMesocycle: 6,
      experienceLevel: 'intermediate',
    });
    expect(r.targetRIR).toBe(2);
    expect(r.volumeMultiplier).toBe(1.15);
  });

  it('W5 Overreach — RIR 1 / RPE 9 / volumen 90% (CNS preserve)', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 4,
      totalWeeksInMesocycle: 6,
      experienceLevel: 'intermediate',
    });
    expect(r.phase).toBe('overreach');
    expect(r.targetRIR).toBe(1);
    expect(r.targetRPE).toBe(9);
    expect(r.volumeMultiplier).toBe(0.9);
  });

  it('W6 Deload — RIR 5 / RPE 5 / volumen 40%', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 5,
      totalWeeksInMesocycle: 6,
      experienceLevel: 'intermediate',
    });
    expect(r.phase).toBe('deload');
    expect(r.targetRIR).toBe(5);
    expect(r.volumeMultiplier).toBe(0.4);
  });

  it('Hashimoto W5 Overreach (intermediate) → RPE 8 / volumen 90%', () => {
    const r = getMicrocycleIntensity({
      microcycleIndex: 4,
      totalWeeksInMesocycle: 6,
      experienceLevel: 'intermediate',
      metabolicConditions: ['hashimoto'],
    });
    expect(r.targetRPE).toBe(8);
    expect(r.targetRIR).toBe(2);
    expect(r.volumeMultiplier).toBe(0.9);
  });
});
