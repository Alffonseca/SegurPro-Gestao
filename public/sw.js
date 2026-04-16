// Simple service worker for PWA support
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('fetch', (event) => {
  // Basic fetch handler to allow offline capability if needed later
  event.respondWith(fetch(event.request));
});
