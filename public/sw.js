
// public/sw.js
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag } = event.data.payload;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: icon || '/icons/icon-192x192.png', // Default icon
        tag: tag || 'leafwise-notification', // Tag to prevent multiple identical notifications
        // Example: Add actions if needed later
        // actions: [
        //   { action: 'view-task', title: 'View Task', icon: '/icons/icon-48x48.png' },
        //   { action: 'dismiss', title: 'Dismiss', icon: '/icons/icon-48x48.png' },
        // ],
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Example: Focus or open a window.
  // This would typically open the app to a specific task or page.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        // Check if any client is already focused
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        // If a client is found, focus it. Otherwise, open a new window.
        if (client.focus) {
          return client.focus();
        }
      }
      // If no client is found or client.focus is not available, open a new window.
      return clients.openWindow('/'); // Open the app's root page
    })
  );
});

// Basic install/activate listeners.
// @ducanh2912/next-pwa will inject Workbox precaching logic around these.
self.addEventListener('install', (event) => {
  // console.log('Service Worker: Installing...');
  // You can add precaching logic here if not handled by next-pwa's Workbox injection
  // For example, if you want to ensure the new SW activates immediately:
  // event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  // console.log('Service Worker: Activating...');
  // Ensure the new service worker takes control of all clients immediately
  // event.waitUntil(self.clients.claim());
});
