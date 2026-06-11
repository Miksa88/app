// ============================================================================
// webPush — registracija service worker-a + push subscription
// ============================================================================
//
// Tok:
//   1. registerServiceWorker() — once on app boot (App.tsx)
//   2. requestPushPermission() — user-initiated (prvi put kad otvori Home)
//   3. subscribeToPush() — uzme PushSubscription iz browser-a, save u DB
//   4. unsubscribeFromPush() — kad user kaže "stop notifs"
//
// VAPID public key se mora uneti kao Vite env var: VITE_VAPID_PUBLIC_KEY.
// Generisanje (locally):  npx web-push generate-vapid-keys
// Privatni key ide u Supabase secrets (za EF send-push): VAPID_PRIVATE_KEY.
// ============================================================================

import { logger } from "@/lib/logger";
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (err) {
    logger.error('SW registration failed:', err);
    return null;
  }
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/**
 * Subscribe to push i sačuvaj endpoint u Supabase.
 * Mora biti pozvana posle requestPushPermission() vraća 'granted'.
 */
export async function subscribeToPush(clientId: string): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false;
  if (Notification.permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (err) {
      logger.error('subscribe failed:', err);
      return false;
    }
  }

  const json = sub.toJSON();
  const endpoint = sub.endpoint;
  const p256dh = (json.keys as Record<string, string>)?.p256dh;
  const auth = (json.keys as Record<string, string>)?.auth;
  if (!p256dh || !auth) return false;

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: clientId,
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      enabled: true,
    },
    { onConflict: 'user_id,endpoint' },
  );
  if (error) {
    logger.error('save subscription failed:', error.message);
    return false;
  }
  return true;
}

export async function unsubscribeFromPush(clientId: string): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', clientId)
      .eq('endpoint', sub.endpoint);
  }
}

// ── Helper: VAPID base64url → Uint8Array (Web Crypto required format) ──
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
