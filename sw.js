// Minimal service worker: exists only so the browser treats this as an
// installable PWA. It deliberately does not cache anything — this app is
// actively updated, and a caching strategy here would risk serving stale
// pages/logic after a deploy. Always go straight to the network.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => { event.respondWith(fetch(event.request)); });
