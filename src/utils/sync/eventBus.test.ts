import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from './eventBus';
import type { SystemEvent } from '@/types/events';

describe('EventBus', () => {
  beforeEach(() => {
    EventBus.reset();
  });

  it('subscribe + emit — handler dobija event', async () => {
    const received: SystemEvent[] = [];
    EventBus.subscribe('WORKOUT_COMPLETED', async (event) => {
      received.push(event);
    });

    const event: SystemEvent = {
      type: 'WORKOUT_COMPLETED',
      clientId: 'c1',
      sessionId: 'A1',
      partition: 'Lower',
      completedAt: new Date(),
    };
    await EventBus.emit(event);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);
  });

  it('vise handler-a po tipu — svi se pozivaju paralelno', async () => {
    const calls: number[] = [];
    EventBus.subscribe('DELOAD_ACTIVATED', async () => { calls.push(1); });
    EventBus.subscribe('DELOAD_ACTIVATED', async () => { calls.push(2); });
    EventBus.subscribe('DELOAD_ACTIVATED', async () => { calls.push(3); });

    await EventBus.emit({
      type: 'DELOAD_ACTIVATED',
      clientId: 'c1',
      reason: 'planned',
      mesocycleIndex: 1,
    });

    expect(calls.sort()).toEqual([1, 2, 3]);
  });

  it('jedna pala handler ne rusi ostale (Sekcija 5.3 + Dodatak B)', async () => {
    const calls: string[] = [];
    EventBus.subscribe('MEAL_LOGGED', async () => {
      calls.push('first');
      throw new Error('intentional fail');
    });
    EventBus.subscribe('MEAL_LOGGED', async () => {
      calls.push('second');
    });

    // Emit ne sme da baci — pale handler se logguje, ostali rade
    await expect(
      EventBus.emit({
        type: 'MEAL_LOGGED',
        clientId: 'c1',
        mealId: 'm1',
        status: 'logged',
        loggedAt: new Date(),
      }),
    ).resolves.not.toThrow();

    expect(calls).toContain('first');
    expect(calls).toContain('second');
  });

  it('emit bez registrovanih handler-a — ne baca', async () => {
    await expect(EventBus.emit({
      type: 'PAUSE_ENDED',
      clientId: 'c1',
    })).resolves.not.toThrow();
  });

  it('handlerCount — debug helper', () => {
    expect(EventBus.handlerCount('WORKOUT_COMPLETED')).toBe(0);

    EventBus.subscribe('WORKOUT_COMPLETED', async () => {});
    EventBus.subscribe('WORKOUT_COMPLETED', async () => {});

    expect(EventBus.handlerCount('WORKOUT_COMPLETED')).toBe(2);
  });

  it('reset cisti sve handler-e', () => {
    EventBus.subscribe('MEAL_LOGGED', async () => {});
    EventBus.subscribe('WORKOUT_COMPLETED', async () => {});
    EventBus.reset();
    expect(EventBus.handlerCount('MEAL_LOGGED')).toBe(0);
    expect(EventBus.handlerCount('WORKOUT_COMPLETED')).toBe(0);
  });
});
