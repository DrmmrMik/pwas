const CACHE_NAME = 'aurafit-v1';
const ASSETS = [
  './',
  'index.html',
  'assets/style.css',
  'assets/app.js',
  'assets/chart.umd.js',
  'assets/lucide.js',
  'manifest.json',
  'icons/icon.svg',
  'icons/icon_192.png',
  'icons/icon_512.png'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache-first with network fallback, dynamic caching for CDNs & fonts
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(networkResponse => {
        // Cache dynamic external assets (CDNs, fonts, etc.)
        const url = new URL(event.request.url);
        const shouldCache = 
          url.origin === location.origin ||
          url.hostname.includes('fonts.googleapis.com') ||
          url.hostname.includes('fonts.gstatic.com') ||
          url.hostname.includes('cdn.jsdelivr.net') ||
          url.hostname.includes('unpkg.com');

        if (shouldCache && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      }).catch(err => {
        console.error('[Service Worker] Fetch failed:', err);
      });
    })
  );
});
