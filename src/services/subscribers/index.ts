// ============================================================================
// subscribers/index.ts — registruje sve event handler-e na startup-u
// Spec: 03_INTEGRATION_LAYER.md Sekcija 5.2 (Subscriber pattern)
// ============================================================================
//
// Pozvati `registerAllSubscribers()` iz src/main.tsx pre nego sto bilo koja
// komponenta moze da emit-uje events.
//
// Idempotentno: ako se pozove vise puta, ne dupli registraciju (interni guard).
// ============================================================================

import { EventBus } from '@/utils/sync/eventBus';
import { registerNutritionSubscribers } from './nutritionSubscribers';
import { registerTrainingSubscribers } from './trainingSubscribers';

let registered = false;

export function registerAllSubscribers(): void {
  if (registered) return;       // idempotent guard
  registered = true;

  registerNutritionSubscribers();
  registerTrainingSubscribers();

  // eslint-disable-next-line no-console
  console.info('[EventBus] Subscribers registered');
}

/**
 * Test helper — resetuje EventBus i registration flag. Koristi samo u testovima.
 */
export function resetSubscribers(): void {
  EventBus.reset();
  registered = false;
}
