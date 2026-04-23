// ============================================================================
// workoutCompletion — pure helpers za IT-7 (post-completion counter update)
// Spec: 01_TRAINING_FLOW_MASTER.md §5 Korak 2.5 (onSessionCompleted)
//       + §7.5 (Return from Break countdown)
//       + §4.8 (PauseEvent illness penalty lifecycle)
//       03_INTEGRATION_LAYER.md §3.1 (WorkoutCompletion flow)
// ============================================================================
//
// RAZLOG POSTOJANJA:
//
// Posle `advancePointerAfterCompletion`-a (koji pomera queue pointer i pise
// `queue.partitionLastSeen`), treba da se ažuriraju dodatni brojači koji žive
// na `UserStatus.training` sloju:
//
//   1. `returnFromBreakCountdown[partition]` — posle pauze, prve 1–2 sesije
//      po particiji su "return from break". Svako kompletiranje te particije
//      decrement-uje brojač za TU particiju. Kad stigne 0, RFB je gotov.
//
//   2. `activePauseEvent.penaltySessionsRemaining` — ako je aktivna bolest
//      (illness), svaki završeni trening smanjuje penalty brojač. Kad stigne
//      0, illness se auto-završava (`activePauseEvent = null`, pauseJustEnded
//      = true). Travel pauza ima `penaltySessionsRemaining = 0` od starta pa
//      ne utiče.
//
//   3. `partitionLastSeen[partition]` — mirror (denormalizovan accessor za UI)
//      iz `queue.partitionLastSeen` u `training.partitionLastSeen`.
//
//   4. `isInReturnFromBreak` — derive (any(countdown > 0)).
//
//   5. `sessionPointer` + `currentMicrocycleIndex` — mirror iz queue-a.
//
// Funkcija je PURE — ne menja ulaz, vraća novi `UserStatusTraining`. Edge
// Function IT-7 je primarni pozivalac; Vitest test pokriva src/ stranu, a
// Deno port živi inline u EF-u jer je logika kratka.
//
// NAPOMENA: `nextSessionId` / `nextSessionPartition` NISU deo ovog helpera —
// to je `resolveNextSession(queue)` posao (živi u `sessionResolver.ts`).
// Pozivalac (EF ili workoutService) zove njega po potrebi.
// ============================================================================

import type { Partition } from '@/types/training';
import type { UserStatusTraining } from '@/types/userStatus';

export interface PostCompletionInput {
  /** UserStatus.training slice nakon što je queue već advanc-ovan
   *  (pozivalac je pozvao `advancePointerAfterCompletion` i merge-ovao
   *  `queue`, `sessionPointer` i `currentMicrocycleIndex` nazad u training). */
  training: UserStatusTraining;
  /** Particija upravo završene sesije (Lower/Upper/FullBody) — pročitana
   *  PRE advance-a iz `queue.sessions[oldPointer].partition`. */
  completedPartition: Partition;
}

export interface PostCompletionResult {
  /** Novi training slice sa ažuriranim brojačima (immutable). */
  training: UserStatusTraining;
  /** true ako je illness pauza upravo završena (penalty hit 0). Edge Function
   *  koristi ovaj flag da UPDATE-uje `pause_events` red
   *  (`is_active=false, end_date=today`). */
  pauseJustEnded: boolean;
}

/**
 * Ažurira post-completion brojače u `UserStatus.training` (pure, immutable).
 *
 * Očekuje: queue je već advancovan (pozivalac je uradio
 * `advancePointerAfterCompletion` pre poziva).
 */
export function applyPostCompletionCounters(
  input: PostCompletionInput,
): PostCompletionResult {
  const { training, completedPartition } = input;

  // 1. Mirror partitionLastSeen iz queue strane. `advancePointerAfterCompletion`
  //    je upravo upisao svežu vrednost u `queue.partitionLastSeen[partition]`.
  const queuePartitionEntry = training.queue.partitionLastSeen[completedPartition];
  const newPartitionLastSeen = queuePartitionEntry
    ? {
        ...training.partitionLastSeen,
        [completedPartition]: {
          date: queuePartitionEntry.date,
          sessionId: queuePartitionEntry.sessionId,
        },
      }
    : { ...training.partitionLastSeen };

  // 2. Decrement returnFromBreakCountdown za tu particiju (min 0).
  const prevCountdown = training.queue.returnFromBreakCountdown[completedPartition] ?? 0;
  const nextCountdownForPartition = Math.max(0, prevCountdown - 1);
  const newReturnFromBreakCountdown = {
    ...training.queue.returnFromBreakCountdown,
    [completedPartition]: nextCountdownForPartition,
  };

  // 3. isInReturnFromBreak = bilo koja particija ima countdown > 0.
  const isInReturnFromBreak = (Object.values(newReturnFromBreakCountdown) as number[]).some(
    v => typeof v === 'number' && v > 0,
  );

  // 4. Illness penalty decrement + auto-end.
  let newActivePauseEvent = training.activePauseEvent;
  let pauseJustEnded = false;

  if (
    training.activePauseEvent &&
    training.activePauseEvent.type === 'illness' &&
    training.activePauseEvent.penaltySessionsRemaining > 0
  ) {
    const nextRemaining = training.activePauseEvent.penaltySessionsRemaining - 1;
    if (nextRemaining <= 0) {
      newActivePauseEvent = null;
      pauseJustEnded = true;
    } else {
      newActivePauseEvent = {
        ...training.activePauseEvent,
        penaltySessionsRemaining: nextRemaining,
      };
    }
  }

  // 5. Mirror microcycle index + pointer iz queue-a (queue je već advanc-ovan).
  const newTraining: UserStatusTraining = {
    ...training,
    queue: {
      ...training.queue,
      returnFromBreakCountdown: newReturnFromBreakCountdown,
    },
    sessionPointer: training.queue.sessionPointer,
    currentMicrocycleIndex: training.queue.currentMicrocycleIndex,
    partitionLastSeen: newPartitionLastSeen,
    isInReturnFromBreak,
    activePauseEvent: newActivePauseEvent,
  };

  return { training: newTraining, pauseJustEnded };
}
