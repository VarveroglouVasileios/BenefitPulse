self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/pwa-192x192.png',
      badge: '/badge.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
        url: data.url
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Only allow same-origin relative paths so a notification can never open an arbitrary external URL
  var url = event.notification.data && event.notification.data.url;
  var safeUrl = typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  event.waitUntil(
    clients.openWindow(safeUrl)
  );
});
