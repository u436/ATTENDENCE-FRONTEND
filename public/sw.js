// Service Worker for Attendance Tracker
// Provides Web Push Notifications support

const CACHE_NAME = 'attendance-tracker-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked');
  event.notification.close();

  // Get the URL from notification data or use default
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push events - THIS IS THE KEY FOR MEESHO-STYLE NOTIFICATIONS
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received!', event);
  
  let data = {
    title: '📚 Attendance Tracker',
    body: 'Time to mark your attendance!',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'attendance-reminder',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.data?.url || '/',
      dateOfArrival: Date.now()
    },
    actions: [
      { action: 'open', title: '📝 Mark Attendance' },
      { action: 'dismiss', title: '❌ Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification action buttons
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  
  if (action === 'dismiss') {
    event.notification.close();
    return;
  }
  
  // For 'open' action or direct click
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/timetable';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
