self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker Active');
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NOTIFY') {
        self.registration.showNotification(event.data.title, {
            body: event.data.body,
            icon: 'https://via.placeholder.com/128/8ac6d1/ffffff?text=💙',
            vibrate: [200, 100, 200],
            tag: 'chirkut-notification' // Prevents duplicate stacking
        });
    }
});
