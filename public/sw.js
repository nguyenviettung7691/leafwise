
// Make sure to import Workbox libraries if you're using them for other purposes
// e.g., import { StaleWhileRevalidate } from 'workbox-strategies';
// import { registerRoute } from 'workbox-routing';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// Standard service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  // Optionally, force the waiting service worker to become the active service worker.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  // Optionally, take control of all clients immediately.
  event.waitUntil(self.clients.claim());
});

// Custom push notification listener
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'LeafWise', body: 'You have a new notification.' };
  const title = data.title || 'LeafWise';
  const options = {
    body: data.body || 'Something new happened!',
    icon: data.icon || '/icons/icon-192x192.png', // Ensure this path is correct
    badge: data.badge || '/icons/icon-72x72.png',  // Ensure this path is correct
    tag: data.tag || 'leafwise-notification',
    data: data.data || { url: '/' } // Default to opening the homepage
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || { url: '/' };
  const urlToOpen = new URL(notificationData.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus().then(c => c.navigate(urlToOpen));
      }
      return clients.openWindow(urlToOpen);
    })
  );
});


// --- Precache Filtering Logic ---
// Patterns for Next.js internal files that might cause issues with precaching,
// now updated to handle full URLs.
const patternsToExclude = [
  /^(https?:\/\/[^\/]+)?\/?app-build-manifest\.json(\?.*)?$/,
  /^(https?:\/\/[^\/]+)?\/?app-route-manifest\.json(\?.*)?$/,
  /^(https?:\/\/[^\/]+)?\/?_next\/static\/[a-zA-Z0-9_-]+\/_buildManifest\.js(\?.*)?$/,
  /^(https?:\/\/[^\/]+)?\/?_next\/static\/[a-zA-Z0-9_-]+\/_ssgManifest\.js(\?.*)?$/,
  /\.map$/, // Exclude all source maps
  /^(https?:\/\/[^\/]+)?\/?middleware-manifest\.json(\?.*)?$/,
  /^(https?:\/\/[^\/]+)?\/?next-font-manifest\.(js|json)(\?.*)?$/,
];

const originalManifest = self.__WB_MANIFEST || [];

// Log the original manifest for debugging purposes
// console.log('[SW] Original Precache Manifest:', JSON.stringify(originalManifest, null, 2));

const filteredManifest = originalManifest.filter(entry => {
  // entry can be a string URL or an object { url: string, revision: string }
  const url = typeof entry === 'string' ? entry : entry.url;
  const shouldExclude = patternsToExclude.some(pattern => pattern.test(url));
  if (shouldExclude) {
    console.log('[SW] Excluding from precache:', url);
  }
  return !shouldExclude;
});

// console.log('[SW] Filtered Precache Manifest:', JSON.stringify(filteredManifest, null, 2));

// Workbox Precaching
// This line is critical: Workbox will precache all assets listed in `filteredManifest`.
// `@ducanh2912/next-pwa` injects `self.__WB_MANIFEST` during the build.
if (filteredManifest.length > 0) {
  precacheAndRoute(filteredManifest);
} else if (originalManifest.length > 0) {
  console.warn('[SW] All manifest entries were excluded. This might indicate an issue with exclusion patterns or an empty original manifest.');
  // Still call precacheAndRoute with the original if filtered is empty but original was not,
  // this might happen if patterns are too aggressive or __WB_MANIFEST is structured unexpectedly.
  // However, this could re-introduce the original error if the problematic files are still in originalManifest.
  // A safer fallback might be to precache nothing if filtering results in an empty list from a non-empty original.
  // For now, let's attempt with the original if filtered is empty from a non-empty source.
  // precacheAndRoute(originalManifest); 
}


cleanupOutdatedCaches();

// You can add custom runtime caching strategies below if needed,
// e.g., for API calls or third-party assets not covered by precaching.
// Example:
// registerRoute(
//   ({url}) => url.origin === 'https://some-api.example.com',
//   new StaleWhileRevalidate({
//     cacheName: 'api-cache',
//   })
// );
