import { describe, it, expect } from 'vitest';
import { applyBiofeedbackReactiveRules } from './biofeedbackReactiveRules';

describe('applyBiofeedbackReactiveRules — pocetnici.md §4.3', () => {
  it('Pumpa <5 → +1g soli + 500ml vode', () => {
    const r = applyBiofeedbackReactiveRules({ pumpScore: 4 });
    expect(r.preworkoutSaltGramsBonus).toBe(1);
    expect(r.preworkoutWaterMlBonus).toBe(500);
  });

  it('Pumpa ≥5 → bez bonusa', () => {
    const r = applyBiofeedbackReactiveRules({ pumpScore: 7 });
    expect(r.preworkoutSaltGramsBonus).toBe(0);
  });

  it('San <5 → +1 šaka ovsa u Obrok 5', () => {
    const r = applyBiofeedbackReactiveRules({ sleepQualityScore: 3 });
    expect(r.obrok5OatsHandfulBonus).toBe(1);
  });

  it('Lutealna faza → +1 supena ulja', () => {
    const r = applyBiofeedbackReactiveRules({ cyclePhase: 'luteal' });
    expect(r.lutealFatTablespoonBonus).toBe(1);
  });

  it('Libido <4 + smartCut active → pauseSmartCut', () => {
    const r = applyBiofeedbackReactiveRules({
      libidoScore: 2,
      currentSmartCutStep: 1,
    });
    expect(r.pauseSmartCut).toBe(true);
  });

  it('Libido <4 ali smartCut step 0 → ne pauziraj (ništa za pauzirati)', () => {
    const r = applyBiofeedbackReactiveRules({
      libidoScore: 2,
      currentSmartCutStep: 0,
    });
    expect(r.pauseSmartCut).toBe(false);
  });

  it('Water retention >7 → alert + ne smanjuj hidrate', () => {
    const r = applyBiofeedbackReactiveRules({ waterRetentionScore: 8 });
    expect(r.waterRetentionAlert).toBe(true);
    expect(r.notes.some(n => n.includes('NE smanjivati hidrate'))).toBe(true);
  });

  it('Sva pravila zaredom — kompozicija radi', () => {
    const r = applyBiofeedbackReactiveRules({
      pumpScore: 3,
      sleepQualityScore: 4,
      cyclePhase: 'luteal',
      libidoScore: 2,
      waterRetentionScore: 9,
      currentSmartCutStep: 2,
    });
    expect(r.preworkoutSaltGramsBonus).toBe(1);
    expect(r.obrok5OatsHandfulBonus).toBe(1);
    expect(r.lutealFatTablespoonBonus).toBe(1);
    expect(r.pauseSmartCut).toBe(true);
    expect(r.waterRetentionAlert).toBe(true);
  });
});
