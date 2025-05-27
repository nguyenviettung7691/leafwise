
// MODULE_NAME_FALLBACK: "workbox-core"
// MODULE_NAME_FALLBACK: "workbox-precaching"
// MODULE_NAME_FALLBACK: "workbox-routing"
// MODULE_NAME_FALLBACK: "workbox-strategies"

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

// Define patterns for files to exclude from precaching
// These patterns match the path part of the URL after the domain
const patternsToExclude = [
  /\/app-build-manifest\.json(\?.*)?$/,
  /\/app-route-manifest\.json(\?.*)?$/,
  /\/\_next\/static\/[a-zA-Z0-9._-]+\/_buildManifest\.js(\?.*)?$/, // Added '.' to char class for build IDs like Next.js 14 uses
  /\/\_next\/static\/[a-zA-Z0-9._-]+\/_ssgManifest\.js(\?.*)?$/,   // Added '.'
  /\.map$/,
  /\/middleware-manifest\.json(\?.*)?$/,
  /\/next-font-manifest\.(js|json)(\?.*)?$/,
];

const originalManifest = self.__WB_MANIFEST || [];

const filteredManifest = originalManifest.filter(entry => {
  const urlString = typeof entry === 'string' ? entry : entry.url;
  let pathOnly = urlString;
  try {
    // Attempt to parse as a full URL and get the pathname
    const parsedUrl = new URL(urlString, self.location.origin);
    pathOnly = parsedUrl.pathname + parsedUrl.search; // include search query for matching
  } catch (e) {
    // If it's not a full URL, assume it's a path already (might start with / or not)
    // Ensure it starts with a / for consistent regex matching
    if (!pathOnly.startsWith('/')) {
      pathOnly = '/' + pathOnly;
    }
  }

  const isExcluded = patternsToExclude.some(pattern => pattern.test(pathOnly));
  
  if (isExcluded) {
    console.log('[SW] Excluding from precache:', urlString, '(Path tested:', pathOnly, ')');
  } else {
    // console.log('[SW] Keeping in precache:', urlString, '(Path tested:', pathOnly, ')');
  }
  return !isExcluded;
});

if (filteredManifest.length < originalManifest.length) {
  console.log(`[SW] Filtered manifest: ${filteredManifest.length} entries from original ${originalManifest.length}`);
} else {
  console.log('[SW] No entries excluded by custom filter. Original manifest entries:', originalManifest.length);
}
// Make sure filteredManifest is not empty if originalManifest was not
if (originalManifest.length > 0 && filteredManifest.length === 0) {
  console.warn('[SW] Warning: All entries were filtered out from precache manifest. This is likely an issue with exclusion patterns.');
  // To be safe, use originalManifest if filtering results in empty, but original had items
  precacheAndRoute(originalManifest);
} else {
  precacheAndRoute(filteredManifest);
}


// Example runtime caching rule (already present for placehold.co)
registerRoute(
  /^https:\/\/placehold\.co\/.*/i,
  new CacheFirst({
    cacheName: 'placeholder-images',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200], // Cache opaque and successful responses
      }),
      // Re-add expiration if the previous _ref error is resolved, or keep it simple
      // new ExpirationPlugin({
      //   maxEntries: 50,
      //   maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      // }),
    ],
  })
);


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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
