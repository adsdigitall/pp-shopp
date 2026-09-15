// Service worker do Radar de Oferta: só notificações (não guarda cache do app).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Radar de Oferta', {
    body: data.body || 'Você tem uma novidade nas suas vendas.',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-96.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    vibrate: [120, 60, 120],
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target).catch(() => undefined);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
