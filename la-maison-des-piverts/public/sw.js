// Service Worker - La Maison des Piverts
// Gestion des notifications de péremption

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

// Reçoit les push envoyés par la Edge Function Supabase
self.addEventListener('push', function(event) {
  let data = { title: '⚠️ Péremption', body: 'Des objets sont à vérifier.', tag: 'peremption-pivert' };
  try { data = Object.assign(data, event.data.json()); } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './pivert.png',
      badge: './pivert.png',
      tag: data.tag,
      renotify: false,
      vibrate: [200, 100, 200]
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
