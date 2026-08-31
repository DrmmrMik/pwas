// Charleston Travel Companion Service Worker (Offline-First)
const BUILD_STAMP = '2026.08.15-005';
const CACHE_NAME = 'travel-charleston-v0.2.3';

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./eink/index.html",
  "./index.eink.html",
  "./assets/eink-B1ORFEfA.js",
  "./assets/eink-kSNT-0iW.css",
  "./assets/main-CZe8hw91.css",
  "./assets/main-Dn9TmdRP.js",
  "./assets/settingsView-Dgihpmma.css",
  "./assets/settingsView-DxCnarTf.js",
  "./eink/manifest.json",
  "./eink/manifest.webmanifest",
  "./icon-192-maskable.png",
  "./icon-192.png",
  "./icon-512-maskable.png",
  "./icon-512.png",
  "./icon.svg",
  "./manifest.json",
  "./manifest.webmanifest"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('SW precache item failed:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        if (url.pathname.includes('/eink/')) {
          return caches.match('./eink/index.html') || caches.match('./index.html');
        }
        return caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
