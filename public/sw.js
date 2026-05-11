/* ===========================================================================
 * fitbyivana — Service Worker
 * ===========================================================================
 *
 * Push notification handler + minimum offline shell.
 * Fired by Web Push protocol kad backend pozove EF send-push.
 *
 * Payload format (JSON):
 *   { title: string, body: string, url?: string, tag?: string, icon?: string }
 * =========================================================================== */

// ── Push event ──
self.addEventListener('push', (event) => {
  let data = { title: 'fitbyivana', body: 'Imaš novu poruku.' };
  if (event.data) {
    try { data = event.data.json(); } catch { /* fallback default */ }
  }

  const title = data.title || 'fitbyivana';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: data.url || '/' },
    tag: data.tag,                  // dedup — istom tag-u se zameni stara
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click — fokusiraj/otvori app na url-u iz data-e ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // Postoji otvoren tab? Fokus + navigacija
      for (const win of wins) {
        if ('focus' in win) {
          win.focus();
          if ('navigate' in win) win.navigate(url);
          return;
        }
      }
      // Inače otvori novi
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

// ── Install + activate (no-op shell) ──
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
