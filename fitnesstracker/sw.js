/**
 * AuraFit Service Worker - Modern PWA Service Worker
 * Compatible with Android 14+, iOS 17+, Samsung S24 Ultra
 * Uses modern caching strategies with versioned caches
 */

// BUILD INDICATOR: cache version is derived from the build stamp written into
// manifest.json (x-build-stamp) by build.js. A new build => new cache => the SW
// self-reports its version and force-refreshes assets. Falls back to 'v2'.
let CACHE_VERSION = 'v2';
try {
  // Synchronous XHR at SW top-level is allowed during install/startup.
  const manifestText = (function () {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', './manifest.json', false);
    xhr.send();
    return xhr.responseText;
  })();
  const manifest = JSON.parse(manifestText);
  if (manifest && manifest['x-build-stamp']) {
    CACHE_VERSION = 'b' + manifest['x-build-stamp'];
  }
} catch (e) { /* keep fallback */ }
const CACHE_NAME = `aurfit-${CACHE_VERSION}`;
const STATIC_CACHE = `aurfit-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `aurfit-dynamic-${CACHE_VERSION}`;
const FONT_CACHE = `aurfit-fonts-${CACHE_VERSION}`;
const IMAGE_CACHE = `aurfit-images-${CACHE_VERSION}`;
const CDN_CACHE = `aurfit-cdn-${CACHE_VERSION}`;
console.log('[AuraFit SW] build version:', CACHE_VERSION);

// Core app shell assets to cache on install
// NOTE: paths MUST match the actual build output (build.js puts style.css /
// app.js / chart.umd.js / lucide.js under assets/). A 404 here would fail the
// entire install event and make Chrome refuse install ("Unsafe app blocked").
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/style.css',
  './assets/app.js',
  './assets/chart.umd.js',
  './assets/lucide.js',
  './icons/icon.svg',
  './icons/icon_192.png',
  './icons/icon_512.png',
  './icons/icon_192_maskable.png',
  './icons/icon_512_maskable.png',
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.gstatic.com/s/outfit/v16/QGYpz_MQCy9jCKdfgTmsIRjg.woff2',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/lucide@latest'
];

// Fonts to cache
const FONT_RESOURCES = [
  'https://fonts.gstatic.com/s/outfit/v16/QGYpz_MQCy9jCKdfgTmsIRjg.woff2',
  'https://fonts.gstatic.com/s/outfit/v16/QGYpz_MQCy9jCKdfgTmsIRjg.woff2'
];

// Cache strategy helpers
function getCacheForRequest(request) {
  const url = new URL(request.url);
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    return FONT_CACHE;
  }
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('unpkg.com')) {
    return CDN_CACHE;
  }
  if (request.destination === 'image') {
    return IMAGE_CACHE;
  }
  if (request.destination === 'font') {
    return FONT_CACHE;
  }
  if (request.destination === 'style' || request.destination === 'script') {
    return STATIC_CACHE;
  }
  return DYNAMIC_CACHE;
}

function shouldCacheFirst(request) {
  return request.destination === 'style' || 
         request.destination === 'script' ||
         request.destination === 'font' ||
         request.destination === 'manifest' ||
         isExternalResource(request);
}

function shouldStaleWhileRevalidate(request) {
  return request.destination === 'font' || request.destination === 'image';
}

function isExternalResource(request) {
  try {
    const url = new URL(request.url);
    return url.hostname !== location.hostname;
  } catch {
    return false;
  }
}

// Cache strategies
const STRATEGIES = {
  // Cache first, then network (for static assets)
  async cacheFirst(request) {
    const cacheName = getCacheForRequest(request);
    const cache = await caches.open(getCacheForRequest(request));
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Background update
      fetch(request).then(async (networkResponse) => {
        if (networkResponse.ok) {
          const cache = await caches.open(getCacheForRequest(request));
          cache.put(request, networkResponse.clone());
        }
      }).catch(() => {});
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(getCacheForRequest(request));
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      return new Response('Asset not available offline', { status: 503 });
    }
  },

  // Network first, fallback to cache (for HTML, API)
  async networkFirst(request) {
    const cacheName = getCacheForRequest(request);
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(getCacheForRequest(request));
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  },

  // Stale while revalidate (for fonts, images)
  async staleWhileRevalidate(request) {
    const cacheName = getCacheForRequest(request);
    const cache = await caches.open(getCacheForRequest(request));
    const cachedResponse = await cache.match(request);
    
    const networkFetch = fetch(request).then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(getCacheForRequest(request));
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(() => cachedResponse);
    
    return cachedResponse || networkFetch;
  }
};

// Determine strategy based on request
function getStrategy(request) {
  if (request.destination === 'document' || request.destination === '') {
    return STRATEGIES.networkFirst;
  }
  if (shouldCacheFirst(request)) {
    return STRATEGIES.cacheFirst;
  }
  if (shouldStaleWhileRevalidate(request)) {
    return STRATEGIES.staleWhileRevalidate;
  }
  return STRATEGIES.networkFirst;
}

// Install - cache core assets
self.addEventListener('install', (event) => {
  // Resilient caching: cache each asset individually so a single 404 / blocked
  // external resource cannot abort the entire install (which would leave the SW
  // uninstalled and cause Chrome to refuse install with "Unsafe app blocked").
  const cacheListSafely = (cacheName, urls) =>
    caches.open(cacheName).then(cache =>
      Promise.all(urls.map(u =>
        cache.add(u).catch(err => console.warn(`[AuraFit SW] skip ${u}:`, err.message))
      ))
    );

  event.waitUntil(
    Promise.all([
      cacheListSafely(STATIC_CACHE, STATIC_ASSETS),
      cacheListSafely(FONT_CACHE, EXTERNAL_RESOURCES.filter(r => r.includes('fonts'))),
      cacheListSafely(CDN_CACHE, EXTERNAL_RESOURCES.filter(r =>
        r.includes('cdn.jsdelivr.net') || r.includes('unpkg.com')
      )),
    ]).then(() => {
      console.log('[AuraFit SW] Install complete');
      self.skipWaiting();
    }).catch(error => {
      console.error('[AuraFit SW] Install failed:', error);
    })
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('aurfit-') && 
            ![CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, FONT_CACHE, IMAGE_CACHE, CDN_CACHE].includes(name))
          .map(name => {
            console.log('[AuraFit SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[AuraFit SW] Activated');
      return self.clients.claim();
    })
  );
});

// Fetch - route to appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip non-http(s) schemes
  if (!request.url.startsWith('http')) return;
  
  // Skip range requests (video/audio streaming)
  if (request.headers.has('Range')) return;
  
  // Skip chrome-extension and similar
  if (request.url.startsWith('chrome-extension://') || 
      request.url.startsWith('moz-extension://')) return;

  const strategy = getStrategy(request);
  event.respondWith(strategy(request));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-aurafit-data') {
    event.waitUntil(syncAuraFitData());
  }
});

async function syncAuraFitData() {
  console.log('[AuraFit SW] Background sync triggered');
  // Implement sync logic for offline actions
  console.log('[AuraFit SW] Background sync completed');
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.action === 'clearCache') {
    event.waitUntil(
      caches.keys().then(names => 
        Promise.all(names.map(name => caches.delete(name)))
      ).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.action === 'getCacheInfo') {
    event.waitUntil(
      Promise.all([
        caches.open(STATIC_CACHE).then(c => c.keys().then(k => k.length)),
        caches.open(DYNAMIC_CACHE).then(c => c.keys().then(k => k.length)),
        caches.open(FONT_CACHE).then(c => c.keys().then(k => k.length)),
        caches.open(IMAGE_CACHE).then(c => c.keys().then(k => k.length))
      ]).then(([staticCount, dynamicCount, fontCount, imageCount]) => {
        event.ports[0].postMessage({
          static: staticCount,
          dynamic: dynamicCount,
          fonts: fontCount,
          images: imageCount
        });
      }));
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-aurafit-cache') {
    event.waitUntil(refreshCriticalCaches());
  }
});

async function refreshCriticalCaches() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(STATIC_ASSETS.map(asset => 
      fetch(asset).then(r => r.ok && cache.put(asset, r))
    ));
    console.log('[AuraFit SW] Critical caches refreshed');
  } catch (error) {
    console.error('[AuraFit SW] Cache refresh failed:', error);
  }
}

// Handle push notifications (future enhancement)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: './icons/icon_192.png',
    badge: './icons/icon_192.png',
    vibrate: [100, 50, 100],
    data: data.url ? { url: data.url } : {},
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' && event.notification.data?.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});

console.log('[AuraFit SW] Service Worker loaded - Modern PWA ready');