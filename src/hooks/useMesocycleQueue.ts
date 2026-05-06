// ============================================================================
// useMesocycleQueue — derive queue iz UserStatus.training.queue
// ============================================================================

import { useMemo } from 'react';
import { useUserStatus } from './useUserStatus';
import type { MesocycleQueue } from '@/types/training';

export interface UseMesocycleQueueResult {
  queue: MesocycleQueue | null;
  isLoading: boolean;
  error: Error | null;
}

export function useMesocycleQueue(clientId: string | null): UseMesocycleQueueResult {
  const { status, isLoading, error } = useUserStatus(clientId);

  const queue = useMemo<MesocycleQueue | null>(
    () => status?.training.queue ?? null,
    [status],
  );

  return { queue, isLoading, error };
}
