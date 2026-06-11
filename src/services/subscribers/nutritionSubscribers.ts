// ============================================================================
// nutritionSubscribers — handler-i za training/lifecycle events koji uticu
// na nutrition state
// Spec: 03_INTEGRATION_LAYER.md Sekcija 5.2
// ============================================================================
//
// IMPORTANT: vecinu cross-module sync-a vec radi `runSyncRules` (svaki write
// u UserStatus okida ga, i tada sva 8 pravila ponovo evaluira state). Zato
// ovde NE pišemo "syncNutritionToDeload" — taj sync se desi sam kad service
// pozove updateUserStatus + runSyncRules.
//
// Subscribers ovde su za:
//   1. Audit log (development console — Faza 5: pravi analytics)
//   2. Push notifications (TODO Faza 4 — kad QueueStrip + SyncEventBanner postoje)
//   3. Trener notifikacije (TODO Faza 4)
// ============================================================================

import { logger } from "@/lib/logger";
import { EventBus } from '@/utils/sync/eventBus';

export function registerNutritionSubscribers(): void {
  EventBus.subscribe('DELOAD_ACTIVATED', async (event) => {
    logger.info(`[Nutrition] Deload aktiviran za ${event.clientId} ` +
      `(reason=${event.reason}, mezo=${event.mesocycleIndex}). ` +
      `Sledeci runSyncRules ce postaviti nutrition na maintenance.`);
    // TODO Faza 4: trigger SyncEventBanner "Deload nedelja — ishrana je na maintenance"
  });

  EventBus.subscribe('RETURN_FROM_BREAK_STARTED', async (event) => {
    logger.info(`[Nutrition] Return from Break za ${event.clientId} (${event.partition}). ` +
      `Nutrition deficit ide na -8% (tdee × 0.92).`);
  });

  EventBus.subscribe('PAUSE_STARTED', async (event) => {
    logger.info(`[Nutrition] Pauza pokrenuta (${event.pauseType}) za ${event.clientId}.`);
    // TODO Faza 4: ako 'illness', SyncEventBanner sa "-5% deficit, polako vracamo"
  });

  EventBus.subscribe('METABOLIC_NOISE_TRIGGERED', async (event) => {
    logger.warn(`[Nutrition] Metabolic noise za ${event.clientId}: ` +
      `${event.percentage}% tecnih kalorija. Plan adjustment blokiran 3 dana.`);
    // TODO Faza 4: SyncEventBanner zuti warning + sugestija "smanji tečne kalorije"
  });
}
