// ============================================================================
// trainingSubscribers — handler-i za nutrition/lifecycle events koji uticu
// na training state ili UI
// Spec: 03_INTEGRATION_LAYER.md Sekcija 5.2
// ============================================================================
//
// Slicno nutrition subscribers — vecinu sync-a radi runSyncRules sam.
// Ovi handleri su za:
//   1. Audit log (Faza 5: analytics)
//   2. UI banner triggers (TODO Faza 4)
//   3. Trener red-flag notifikacije (TODO Faza 4)
// ============================================================================

import { EventBus } from '@/utils/sync/eventBus';

export function registerTrainingSubscribers(): void {
  EventBus.subscribe('WORKOUT_COMPLETED', async (event) => {
    // eslint-disable-next-line no-console
    console.info(`[Training] Workout completed: ${event.sessionId} ` +
      `(${event.partition}) za ${event.clientId} u ${event.completedAt.toISOString()}`);
    // TODO Faza 4: animation trigger "Bravo! +1 streak"
  });

  EventBus.subscribe('LEVEL_UP_ACHIEVED', async (event) => {
    // eslint-disable-next-line no-console
    console.info(`[Training] Level up: ${event.clientId} → ${event.newLevel}`);
    // TODO Faza 4: celebration screen + push notif
  });

  EventBus.subscribe('LEVEL_DOWN_TRIGGERED', async (event) => {
    // eslint-disable-next-line no-console
    console.warn(`[Training] Level down za ${event.clientId} — sugesti regresija`);
  });

  EventBus.subscribe('TRAINING_INTENSITY_REDUCE', async (event) => {
    // eslint-disable-next-line no-console
    console.info(`[Training] Intensity reduce ${event.reduction * 100}% (${event.reason}) ` +
      `za ${event.clientId}`);
  });

  EventBus.subscribe('TRAINING_VOLUME_REDUCE', async (event) => {
    // eslint-disable-next-line no-console
    console.info(`[Training] Volume reduce ${event.reduction * 100}% (${event.reason}) ` +
      `za ${event.clientId}`);
  });

  EventBus.subscribe('HYDRATION_FIRST_WARNING', async (event) => {
    // eslint-disable-next-line no-console
    console.info(`[Training] Hydration first warning za ${event.clientId}: ${event.message}`);
    // TODO Faza 4: SyncEventBanner "💧 Pre vežbe popij vodu"
  });
}
