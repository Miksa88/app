import { describe, it, expect } from 'vitest';
import { evaluateWeek8 } from './week8Evaluation';

describe('evaluateWeek8 — pocetnici.md §6.1', () => {
  it('Snaga +20%, ciklus regularan, motivisana → +10% kcal, reset Pravilo 7d, green', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 20,
      cycleStatus: 'regular',
      mentalStatus: 'motivated',
    });
    expect(r.calorieAdjustmentPct).toBe(0.10);
    expect(r.resetPravilo7Dana).toBe(true);
    expect(r.greenLight).toBe(true);
    expect(r.allowOverreachNextMesocycle).toBe(true);
  });

  it('Snaga +10%, regularan, motivisana → standardni nastavak, bez kcal change', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 10,
      cycleStatus: 'regular',
      mentalStatus: 'motivated',
    });
    expect(r.calorieAdjustmentPct).toBe(0);
    expect(r.resetPravilo7Dana).toBe(false);
    expect(r.greenLight).toBe(true);
  });

  it('Snaga 0% → Reverse +10% kcal, plan se ne menja', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 0,
      cycleStatus: 'regular',
      mentalStatus: 'motivated',
    });
    expect(r.calorieAdjustmentPct).toBe(0.10);
    expect(r.resetPravilo7Dana).toBe(false);
  });

  it('Ciklus minor shift → žuto, Overreach disabled', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 10,
      cycleStatus: 'shifted_minor',
      mentalStatus: 'motivated',
    });
    expect(r.allowOverreachNextMesocycle).toBe(false);
    expect(r.greenLight).toBe(true);
    expect(r.blockNewMesocycle).toBe(false);
  });

  it('Ciklus major shift → CRVENO, blockNewMesocycle, +10% kcal, volumen -30%', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 10,
      cycleStatus: 'shifted_major',
      mentalStatus: 'motivated',
    });
    expect(r.blockNewMesocycle).toBe(true);
    expect(r.greenLight).toBe(false);
    expect(r.calorieAdjustmentPct).toBe(0.10);
    expect(r.volumeAdjustmentPct).toBe(-0.30);
    expect(r.allowOverreachNextMesocycle).toBe(false);
  });

  it('Burnout → Diet Break 2 nedelje, volumen -50%, blockNewMesocycle', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 10,
      cycleStatus: 'regular',
      mentalStatus: 'burnout',
    });
    expect(r.dietBreakWeeks).toBe(2);
    expect(r.volumeAdjustmentPct).toBe(-0.50);
    expect(r.blockNewMesocycle).toBe(true);
    expect(r.greenLight).toBe(false);
  });

  it('Bored bez burnout → vary exercises, ostalo ok', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 10,
      cycleStatus: 'regular',
      mentalStatus: 'bored',
    });
    expect(r.dietBreakWeeks).toBe(0);
    expect(r.recommendations.some(s => s.toLowerCase().includes('goblet'))).toBe(true);
  });

  it('Hashimoto → Overreach blokiran čak i kad je ciklus regularan', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 10,
      cycleStatus: 'regular',
      mentalStatus: 'motivated',
      hasHashimoto: true,
    });
    expect(r.allowOverreachNextMesocycle).toBe(false);
  });

  it('Burnout + ciklus major shift → najveći volumen cut (-50% wins)', () => {
    const r = evaluateWeek8({
      strengthChangePctOverMesocycle: 5,
      cycleStatus: 'shifted_major',
      mentalStatus: 'burnout',
    });
    expect(r.volumeAdjustmentPct).toBe(-0.50);
    expect(r.dietBreakWeeks).toBe(2);
  });
});
