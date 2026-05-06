// ============================================================================
// workoutService — orkestrator workout life-cycle event-a
// Spec: 03_INTEGRATION_LAYER.md Sekcija 3 + 5
//       + 01_TRAINING_FLOW_MASTER.md Sekcija 5 Korak 2.5 (onSessionCompleted)
// ============================================================================
//
// Glavni event-i:
//   - onSessionCompleted: posle zavrsenog treninga, advance pointer + emit
//   - onSessionStarted: postavi training session u "in progress" mod (placeholder)
//   - onSwapRequested: klijentkinja zameni susedne sesije
// ============================================================================

import type { UserStatus } from '@/types/userStatus';
import type { SetLog, Partition, PauseType } from '@/types/training';
import { updateUserStatus } from '@/utils/db/userStatus';
import {
  advancePointerAfterCompletion,
  resolveNextSession,
  swapNextTwoSessions,
  canSwapNextTwoSessions,
  detectAndShiftMissedSessions,
} from '@/utils/training/sessionResolver';
import { nextCountdownAfterSession } from '@/utils/training/decayCalculator';
import { calcRedFlags } from '@/utils/sync/redFlags';
import { runSyncRules, EventBus } from '@/utils/sync/syncEngine';

// ============================================================================
// onSessionCompleted — posle zavrsetka treninga
// ============================================================================
//
// Operacije (Sekcija 5 Korak 2.5 spec-a 01):
//   1. Advance queue pointer
//   2. Update partitionLastSeen
//   3. Decrement Return from Break countdown za particiju
//   4. Decrement illness penalty sessions remaining
//   5. Detect microcycle completion (reset swap)
//   6. Determine if session was successful (vs. failed reps) → resetFailedWorkouts
//   7. Run sync rules + save
//   8. Emit WORKOUT_COMPLETED
//
// `setLogs` se cuva u workout_session_logs tabelu (placeholder za Fazu 2.4
// kad budemo imali Loading Sloj 4 + progress tracking). Za sad samo
// derive-ujemo "wasSessionSuccessful" iz nje.

export interface SessionCompletionInput {
  clientId: string;
  sessionId: string;
  setLogs: SetLog[];
  wasSessionSuccessful?: boolean;  // ako je hit-ovala target reps na vise od pola setova
}

export async function onSessionCompleted(
  input: SessionCompletionInput,
): Promise<UserStatus> {
  const completedAt = new Date();
  let completedPartition: Partition | null = null;

  const newStatus = await updateUserStatus(
    input.clientId,
    async (status) => {
      // 1+2: Advance pointer (sessionResolver vraca novi queue + microcycle flag)
      const completedSession = status.training.queue.sessions[status.training.queue.sessionPointer];
      completedPartition = completedSession?.partition ?? null;

      const { queue: newQueue } = advancePointerAfterCompletion(
        status.training.queue,
        completedAt,
      );
      status.training.queue = newQueue;
      status.training.sessionPointer = newQueue.sessionPointer;
      status.training.partitionLastSeen = newQueue.partitionLastSeen;
      status.training.currentMicrocycleIndex = newQueue.currentMicrocycleIndex;

      // Update derived next session info
      const next = resolveNextSession(newQueue);
      if (next) {
        status.training.nextSessionId = next.sessionId;
        status.training.nextSessionPartition = next.partition;
      }

      // 3: Decrement Return from Break countdown za zavrsenu particiju
      if (completedPartition && newQueue.returnFromBreakCountdown[completedPartition] !== undefined) {
        const newCountdown = nextCountdownAfterSession(
          newQueue.returnFromBreakCountdown[completedPartition] ?? 0,
        );
        status.training.queue.returnFromBreakCountdown[completedPartition] = newCountdown;
        status.training.isInReturnFromBreak = newCountdown > 0;
      }

      // 4: Decrement illness penalty sessions remaining
      if (status.training.activePauseEvent?.type === 'illness') {
        const remaining = Math.max(0, status.training.activePauseEvent.penaltySessionsRemaining - 1);
        if (remaining === 0) {
          status.training.activePauseEvent = null;
        } else {
          status.training.activePauseEvent = {
            ...status.training.activePauseEvent,
            penaltySessionsRemaining: remaining,
          };
        }
      }

      // 6: Update red flags — uspesna sesija resetuje failed counter
      status.redFlags = calcRedFlags({
        status,
        resetFailedWorkouts: input.wasSessionSuccessful !== false,
        incrementConsecutiveFailedWorkouts: input.wasSessionSuccessful === false ? 1 : 0,
      });
    },
    runSyncRules,
  );

  // 8: Emit
  if (completedPartition) {
    await EventBus.emit({
      type: 'WORKOUT_COMPLETED',
      clientId: input.clientId,
      sessionId: input.sessionId,
      partition: completedPartition,
      completedAt,
    });
  }

  return newStatus;
}

// ============================================================================
// requestSessionSwap — klijentkinja zameni A↔B (1× po mikrociklusu)
// Spec 01 Sekcija 5 Korak 2.5
// ============================================================================

export interface SwapResult {
  success: boolean;
  reason?: string;
  status?: UserStatus;
}

// ============================================================================
// startPauseEvent — aktivira pauzu (bolest/putovanje) + shift kalendara
// Spec: 01 Sekcija 4.8 (PauseEvent) + Faza 4.3 (hibridni model)
// ============================================================================
//
// Kad klijentkinja prijavi bolest ili putovanje, queue se ne menja biološki
// (redosled A→B→A ostaje), ali kalendarski slotovi se pomeraju — sesija koja
// je bila zakazana za danas prebacuje se na sledeći trening dan posle povratka.

export interface StartPauseInput {
  clientId: string;
  pauseType: PauseType;          // 'illness' | 'travel' | 'other'
  startDate: Date;
  penaltySessionsRemaining?: number; // default: 2 za illness, 0 za travel/other
}

export async function startPauseEvent(input: StartPauseInput): Promise<UserStatus> {
  const reason = input.pauseType === 'illness'
    ? 'illness_pause'
    : input.pauseType === 'travel'
      ? 'travel_pause'
      : 'manual_trainer';

  const defaultPenalty = input.pauseType === 'illness' ? 2 : 0;

  return updateUserStatus(input.clientId, async (status) => {
    status.training.activePauseEvent = {
      type: input.pauseType,
      startDate: input.startDate,
      penaltySessionsRemaining: input.penaltySessionsRemaining ?? defaultPenalty,
    };

    const shiftResult = detectAndShiftMissedSessions(
      status.training.queue,
      input.startDate,
      status.training.daysPerWeek,
      reason,
    );
    status.training.queue = shiftResult.updatedQueue;
  }, runSyncRules);
}

export async function requestSessionSwap(clientId: string): Promise<SwapResult> {
  let result: SwapResult = { success: false };

  await updateUserStatus(clientId, async (status) => {
    const eligibility = canSwapNextTwoSessions(status.training.queue);
    if (!eligibility.allowed) {
      result = { success: false, reason: eligibility.reason };
      return;
    }

    const newQueue = swapNextTwoSessions(status.training.queue);
    status.training.queue = newQueue;

    // Update derived next session
    const next = resolveNextSession(newQueue);
    if (next) {
      status.training.nextSessionId = next.sessionId;
      status.training.nextSessionPartition = next.partition;
    }

    result = { success: true, status };
  });

  return result;
}
