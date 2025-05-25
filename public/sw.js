// public/sw.js

// This event is fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('LeafWise Service Worker: Installing...');
  // By calling self.skipWaiting(), the new service worker activates immediately
  // once it's finished installing, instead of waiting for existing clients to close.
  event.waitUntil(self.skipWaiting());
});

// This event is fired when the service worker is activated.
self.addEventListener('activate', (event) => {
  console.log('LeafWise Service Worker: Activating...');
  // self.clients.claim() allows an active service worker to take control of all
  // clients (open tabs/windows of your app) within its scope.
  event.waitUntil(self.clients.claim());
});

// Listener for messages from the client (e.g., for push notifications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data.payload;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: icon || '/icons/icon-192x192.png', // Default icon
        tag: tag || 'default-tag',
      })
    );
  }
});

// Listener for notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Example: focus existing window or open new one
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          let client = clientList[0];
          for (let i = 0; i < clientList.length; i++) {
            if (clientList[i].focused) {
              client = clientList[i];
            }
          }
          return client.focus();
        }
        return self.clients.openWindow('/');
      })
  );
});

// The PWA plugin (@ducanh2912/next-pwa) will inject Workbox related code below this line
// (or integrate this file's content into a Workbox-powered service worker).
// This typically includes:
// - Importing the Workbox library (e.g., importScripts('workbox-sw.js'))
// - Precaching the assets defined in self.__WB_MANIFEST (e.g., workbox.precaching.precacheAndRoute(self.__WB_MANIFEST))
//
// This setup ensures that your app shell (HTML, CSS, JS, fonts defined in your Next.js build)
// is cached and available offline. User data from localStorage and IndexedDB will be
// accessible once the app shell loads from the cache.
