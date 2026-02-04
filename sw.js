self.addEventListener('install', (event) => {
    console.log('Service Worker: Installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated');
});

// Listen for messages from the main app to trigger notifications
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFY') {
        self.registration.showNotification(event.data.title, {
            body: event.data.body,
            icon: 'https://via.placeholder.com/128/63b3ed/ffffff?text=💙', // Placeholder icon
            vibrate: [200, 100, 200]
        });
    }
});
