// ============================================================================
// EventBus — in-memory pub/sub za cross-module komunikaciju
// Spec: 03_INTEGRATION_LAYER.md Sekcija 5 (Event-driven komunikacija)
// ============================================================================
//
// Princip: training i nutrition moduli NIKAD ne zovu jedan drugog direktno
// (Pravilo 1 iz spec-a 03). Sve cross-module komunikacije ide preko event-a.
//
// Implementacija (Sekcija 5.3):
//   - subscribe<T>(eventType, handler) — registruje handler na event tip
//   - emit(event) — paralelno pokrene sve handler-e, sacuva sve da zavrse
//   - per-handler try/catch — jedna pala handler ne sme da rusi ostale
//
// Za production: zameniti sa pravim message queue-om (Supabase Realtime ili
// Redis Pub/Sub). Za MVP in-memory je dovoljan.
// ============================================================================

import type { SystemEvent, SystemEventType, EventHandler, EventOfType } from '@/types/events';

// ============================================================================
// EventBus singleton class
// ============================================================================
//
// Singleton-pattern: postoji jedan globalan bus. Subscriber-i se registruju
// jednom (u registerAllSubscribers() na startup-u), emit-eri pozivaju
// EventBus.emit() bilo kad.

class EventBusImpl {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<SystemEventType, Array<(event: any) => Promise<void>>>();

  /**
   * Registruje handler za odredjeni event tip. Handler je async funkcija.
   * Vise handler-a po tipu su dozvoljeni — pozivaju se PARALELNO.
   */
  subscribe<T extends SystemEventType>(
    eventType: T,
    handler: EventHandler<T>,
  ): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler as (event: EventOfType<T>) => Promise<void>);
    this.handlers.set(eventType, list);
  }

  /**
   * Emit-uje event. Pokrece sve registrovane handler-e PARALELNO i ceka da
   * svi zavrse (i.e. await Promise.all). Per-handler error catch — jedna
   * pala handler ne rusi ostale (Sekcija 5.3 i Dodatak B).
   */
  async emit(event: SystemEvent): Promise<void> {
    const list = this.handlers.get(event.type) ?? [];
    if (list.length === 0) return;

    await Promise.all(
      list.map(handler =>
        handler(event).catch(err => {
          // eslint-disable-next-line no-console
          console.error(`[EventBus] handler za ${event.type} bacio gresku:`, err);
        }),
      ),
    );
  }

  /**
   * Brise sve handler-e — koristi se SAMO u testovima izmedju it() blokova.
   */
  reset(): void {
    this.handlers.clear();
  }

  /**
   * Vraca broj registrovanih handler-a za event tip — debugging/test helper.
   */
  handlerCount(eventType: SystemEventType): number {
    return this.handlers.get(eventType)?.length ?? 0;
  }
}

export const EventBus = new EventBusImpl();
