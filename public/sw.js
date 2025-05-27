// Import Workbox libraries. next-pwa should make these available.
// If you get errors that these can't be found, you might need to install them as devDependencies:
// npm install --save-dev workbox-precaching workbox-routing workbox-strategies workbox-expiration workbox-cacheable-response
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
// import { registerRoute } from 'workbox-routing'; // Not strictly needed if runtimeCaching is in next.config.ts
// import { CacheFirst } from 'workbox-strategies';
// import { ExpirationPlugin } from 'workbox-expiration';
// import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Cleans up old caches during service worker activation.
cleanupOutdatedCaches();

// This is the array of assets to precache.
// next-pwa will replace self.__WB_MANIFEST with the actual manifest.
precacheAndRoute(self.__WB_MANIFEST || []);

// Standard service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('LeafWise Service Worker: Installing...');
  event.waitUntil(self.skipWaiting()); // Activates the new SW faster
});

self.addEventListener('activate', (event) => {
  console.log('LeafWise Service Worker: Activating...');
  event.waitUntil(self.clients.claim()); // Takes control of all clients
});

// Listener for push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'LeafWise Reminder';
  const options = {
    body: data.body || 'You have a new reminder!',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png', // Optional: for Android
    tag: data.tag || 'leafwise-notification',
    data: {
      url: data.url || '/', // URL to open on click
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener for notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList.find(c => c.url === urlToOpen && 'focus' in c);
        if (!client && clientList.length > 0) {
          client = clientList[0]; // Fallback to the first client
        }
        if (client && 'focus' in client) {
          // If client is found, focus it and then navigate.
          // This ensures that if the tab is already open, it's reused.
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      // If no client is found or client cannot be focused, open a new window.
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Custom logic for messages from the client (e.g., to trigger notifications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data.payload;
    const options = {
      body: body || 'You have a new reminder!',
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: tag || 'leafwise-message-notification',
      data: {
        url: '/',
      }
    };
    event.waitUntil(self.registration.showNotification(title || 'LeafWise Message', options));
  }
});
