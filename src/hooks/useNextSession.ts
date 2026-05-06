// ============================================================================
// useNextSession — derive sledeca sesija iz queue.sessions[pointer]
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 5 Korak 2.5 (resolveNextSession)
// ============================================================================

import { useMemo } from 'react';
import { useMesocycleQueue } from './useMesocycleQueue';
import { resolveNextSession } from '@/utils/training/sessionResolver';
import type { QueuedSession } from '@/types/training';

export interface UseNextSessionResult {
  session: QueuedSession | null;
  isLoading: boolean;
  error: Error | null;
  /** True kad je mezociklus zavrsen — sledeci mezo treba generisati */
  isMesocycleComplete: boolean;
}

export function useNextSession(clientId: string | null): UseNextSessionResult {
  const { queue, isLoading, error } = useMesocycleQueue(clientId);

  const session = useMemo<QueuedSession | null>(
    () => queue ? resolveNextSession(queue) : null,
    [queue],
  );

  const isMesocycleComplete = useMemo(
    () => queue !== null && queue.sessionPointer >= queue.sessions.length,
    [queue],
  );

  return { session, isLoading, error, isMesocycleComplete };
}
