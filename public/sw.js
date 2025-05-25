// public/sw.js

// This CACHE_NAME is primarily for cleaning up old, manually created caches
// if you had them in previous versions of this sw.js.
// Workbox (injected by next-pwa) will manage its own cache names.
const CUSTOM_CACHE_PREFIX = 'leafwise-custom-cache-';
const CUSTOM_CACHE_VERSION = 'v1.1'; // Increment this if you change non-Workbox cached assets.
const CUSTOM_CACHE_NAME = `${CUSTOM_CACHE_PREFIX}${CUSTOM_CACHE_VERSION}`;

// Notification cache name (if you want to cache notification actions or icons specifically)
const NOTIFICATION_CACHE = 'leafwise-notification-actions-cache-v1';

// When using swSrc, next-pwa injects Workbox's precaching.
// So, manual precaching here (urlsToCache and cache.addAll in install) is generally not needed
// and can conflict. We will rely on the plugin for this.

self.addEventListener('install', (event) => {
  console.log('[SW] Install event - New SW installing.');
  // self.skipWaiting() ensures the new service worker activates
  // as soon as it's finished installing, replacing the old one.
  // This is crucial for "automatic updates" without user intervention.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event - New SW activating.');
  // self.clients.claim() allows an activated service worker
  // to take control of all open client pages immediately.
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old custom caches that are not managed by Workbox.
      // Workbox handles its own cache versioning and cleanup.
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith(CUSTOM_CACHE_PREFIX) && cacheName !== CUSTOM_CACHE_NAME) {
              console.log('[SW] Deleting old custom cache:', cacheName);
              return caches.delete(cacheName);
            }
            if (cacheName.startsWith('leafwise-notification-actions-cache') && cacheName !== NOTIFICATION_CACHE) {
                console.log('[SW] Deleting old notification cache:', cacheName);
                return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      })
    ])
  );
});

// The fetch event listener for custom caching strategies is removed.
// When using swSrc, next-pwa and Workbox will inject their own fetch listener
// to handle precached assets and potentially runtime caching strategies.
// Overriding it here can break the plugin's caching.

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data } = event.data.payload;
    const options = {
      body: body,
      icon: icon || '/icons/icon-192x192.png', // Ensure this path is correct
      badge: '/icons/icon-72x72.png',    // Ensure this path is correct
      tag: tag || 'leafwise-notification',
      renotify: true, // Re-notify if a new notification with the same tag arrives
      actions: [
        { action: 'open_app', title: 'Open LeafWise' },
        // { action: 'dismiss', title: 'Dismiss' }, // Standard dismiss is usually handled by OS
      ],
      data: data || { url: '/' } // Default data to open the root page
    };
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received.', event.notification);
  event.notification.close(); // Close the notification

  const action = event.action;
  const notificationData = event.notification.data || {};
  // Ensure the URL is correctly formed relative to the origin
  const urlToOpen = new URL(notificationData.url || '/', self.location.origin).href;

  if (action === 'open_app' || !action) { // Default action or specific 'open_app' action
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true // Important to find clients not yet controlled by this SW version
      }).then((clientList) => {
        // Try to find an existing window for the app and focus it
        for (const client of clientList) {
          // Check if the client URL matches and it can be focused
          // For more complex scenarios, you might check if the client is visible
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus().then(c => c.navigate(urlToOpen)); // Navigate to ensure correct page
          }
        }
        // If no existing client is found or can be focused, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
  // Example for other actions if you add them:
  // else if (action === 'some_other_action') {
  //   // Handle other_action
  // }
});
