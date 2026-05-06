// ============================================================================
// userStatusService — orkestrator daily check-in flow-a
// Spec: 03_INTEGRATION_LAYER.md Sekcija 3.1
// ============================================================================
//
// Service sloj wrap-uje pure engine sa DB persistencijom + EventBus emit.
//
// Pattern (Sekcija 3.1 spec-a 03):
//   1. loadUserStatus(clientId)
//   2. applyDailyCheckIn(status, checkIn)  ← pure engine
//   3. saveUserStatus(newStatus)
//   4. EventBus.emit za side effects (notify trener, analytics, etc.)
//
// SVI write-ovi u user_status idu kroz ovu funkciju (Pravilo 2: jedan
// writer po podatku). Direktan supabase.from('user_status').update() iz
// drugih mesta = bug.
// ============================================================================

import type { UserStatus } from '@/types/userStatus';
import type { DailyCheckIn, WeeklyCheckIn } from '@/types/nutrition';
import { loadUserStatus, saveUserStatus, updateUserStatus } from '@/utils/db/userStatus';
import { applyDailyCheckIn, runSyncRules, EventBus } from '@/utils/sync/syncEngine';
import { calcRedFlags } from '@/utils/sync/redFlags';

// ============================================================================
// processDailyCheckIn — glavni entry point posle daily check-in forme
// ============================================================================

export async function processDailyCheckIn(
  clientId: string,
  checkIn: DailyCheckIn,
): Promise<UserStatus> {
  const current = await loadUserStatus(clientId);
  if (!current) {
    throw new Error(
      `processDailyCheckIn(${clientId}) failed: UserStatus ne postoji. ` +
      `Pozovi initUserStatus prvo (preko onboarding flow-a).`,
    );
  }

  // Pure engine — racuna novi state iz starog + check-in inputa
  const newStatus = await applyDailyCheckIn(current, checkIn);

  // Persist — Supabase Realtime ce automatski broadcast-ovati change
  await saveUserStatus(newStatus);

  // Fan-out events za downstream side effects (Faza 5: push notifications,
  // trener dashboard alerts, analytics logging)
  await emitTransitionEvents(current, newStatus);

  return newStatus;
}

// ============================================================================
// processWeeklyCheckIn — nedeljni check-in (resetuje counter)
// Spec 03 Sekcija 2.1: daysSinceLastWeeklyCheckIn -> 0
// ============================================================================

export async function processWeeklyCheckIn(
  clientId: string,
  checkIn: WeeklyCheckIn,
): Promise<UserStatus> {
  const newStatus = await updateUserStatus(clientId, async (s) => {
    s.bio.currentWeightMA5 = checkIn.weightKg;
    s.redFlags = calcRedFlags({
      status: s,
      weeklyCheckInJustCompleted: true,
    });
  }, runSyncRules);

  await EventBus.emit({
    type: 'WEEKLY_CHECKIN_COMPLETED',
    clientId,
    weekIndex: checkIn.weekIndex,
    weightKg: checkIn.weightKg,
  });

  return newStatus;
}

// ============================================================================
// emitTransitionEvents — detektuj promene stanja i emit-uj events
// ============================================================================
//
// Ako se isInDeload promenio false→true, emit DELOAD_ACTIVATED.
// Ako se isInReturnFromBreak promenio false→true, emit RETURN_FROM_BREAK_STARTED.
// Itd. Ovo je jedino mesto gde sync engine "shvata" tranzicije.

async function emitTransitionEvents(prev: UserStatus, next: UserStatus): Promise<void> {
  // Deload tranzicije
  if (!prev.training.isInDeload && next.training.isInDeload) {
    await EventBus.emit({
      type: 'DELOAD_ACTIVATED',
      clientId: next.clientId,
      reason: 'auto_triggered',
      mesocycleIndex: next.training.currentMesocycleIndex,
    });
  }
  if (prev.training.isInDeload && !next.training.isInDeload) {
    await EventBus.emit({ type: 'DELOAD_ENDED', clientId: next.clientId });
  }

  // Return from Break tranzicije
  if (!prev.training.isInReturnFromBreak && next.training.isInReturnFromBreak) {
    await EventBus.emit({
      type: 'RETURN_FROM_BREAK_STARTED',
      clientId: next.clientId,
      partition: next.training.nextSessionPartition,
    });
  }

  // Pause tranzicije
  if (!prev.training.activePauseEvent && next.training.activePauseEvent) {
    await EventBus.emit({
      type: 'PAUSE_STARTED',
      clientId: next.clientId,
      pauseType: next.training.activePauseEvent.type ?? 'other',
      startDate: next.training.activePauseEvent.startDate ?? new Date(),
    });
  }
  if (prev.training.activePauseEvent && !next.training.activePauseEvent) {
    await EventBus.emit({ type: 'PAUSE_ENDED', clientId: next.clientId });
  }
}

// ============================================================================
// Re-export za convenience iz UI komponenti
// ============================================================================

export { loadUserStatus } from '@/utils/db/userStatus';
