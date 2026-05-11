// ============================================================================
// useWebPush — orkestrator push notifikacija
// ============================================================================
//
// Boot flow:
//   1. App.tsx pozove `registerServiceWorker` jednom na mount
//   2. Home.tsx koristi `useWebPush(clientId)` — pokazuje permission prompt
//      jednom (lokalni storage flag) + subscribe ako user kaže Allow
//
// Idempotentno — više poziva ne pravi duplikate (upsert na DB).
// ============================================================================

import { useEffect, useState } from 'react';
import { safeStorage } from '@/lib/safeStorage';
import {
  isPushSupported,
  getPushPermission,
  requestPushPermission,
  subscribeToPush,
} from '@/lib/webPush';

const PROMPT_DISMISSED_KEY = 'fbi.pushPromptDismissed';
const PROMPT_DELAY_MS = 5000; // 5s posle ulaska u Home (ne odmah pri otvaranju)

export interface UseWebPushResult {
  /** true ako browser podržava push */
  supported: boolean;
  /** trenutna permission */
  permission: NotificationPermission;
  /** true ako je vreme za prikaz banner-a (user nije rekao no, nije denied) */
  shouldPrompt: boolean;
  /** Triggers permission request + subscribe; idempotentno */
  enable: () => Promise<boolean>;
  /** Dismiss bez request-a (zatim 30 dana ne pita) */
  dismiss: () => void;
}

export function useWebPush(clientId: string | null): UseWebPushResult {
  const [permission, setPermission] = useState<NotificationPermission>(
    isPushSupported() ? Notification.permission : 'denied',
  );
  const [shouldPrompt, setShouldPrompt] = useState(false);

  useEffect(() => {
    if (!isPushSupported() || !clientId) return;
    if (permission !== 'default') return; // već odgovorila
    const dismissedAt = Number(safeStorage.getItem(PROMPT_DISMISSED_KEY) || 0);
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (dismissedAt > thirtyDaysAgo) return;

    const t = setTimeout(() => setShouldPrompt(true), PROMPT_DELAY_MS);
    return () => clearTimeout(t);
  }, [clientId, permission]);

  const enable = async (): Promise<boolean> => {
    if (!isPushSupported() || !clientId) return false;
    const result = await requestPushPermission();
    setPermission(result);
    setShouldPrompt(false);
    if (result === 'granted') {
      return subscribeToPush(clientId);
    }
    return false;
  };

  const dismiss = () => {
    safeStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
    setShouldPrompt(false);
  };

  // Re-check permission posle vraćanja u tab (možda je user promenio u settings-u)
  useEffect(() => {
    if (!isPushSupported()) return;
    const onFocus = () => {
      void getPushPermission().then(setPermission);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return {
    supported: isPushSupported(),
    permission,
    shouldPrompt,
    enable,
    dismiss,
  };
}
