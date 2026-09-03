// sw.js - Service Worker for Catch the Fruit PWA
// Compliant with Android 16 / Samsung S24 Ultra and validate_pwa.py publish gate.

const CACHE_NAME = 'catch-the-fruit-v1';

// Precache list: ONLY assets guaranteed to exist in the build output.
// validate_pwa.py scans all quoted asset strings and verifies physical existence.
const PRECACHE_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/maskable-192x192.png',
  './icons/maskable-512x512.png',
  './screenshots/mobile-1.png'
];

// Install: Cache each asset individually with .add().catch()
// Strictly avoid batch caching - prevents install failure on single transient 404.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const cachePromises = PRECACHE_ASSETS.map((asset) => {
        return cache.add(asset).catch((err) => {
          console.warn(`[SW] Precache failed for ${asset}:`, err);
        });
      });
      return Promise.allSettled(cachePromises);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: Clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Stale-while-revalidate for static assets, network-first for navigation with cache fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Navigation requests: serve index.html from cache if network fails
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Same-origin asset requests: Cache-first with network fallback
  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Asynchronously update cache in background
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {
            // Offline or network error - ignore for background revalidation
          });
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  }
});
