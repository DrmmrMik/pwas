/**
 * Nova Portal Service Worker - Modern PWA Service Worker
 * Compatible with Android 14+, iOS 17+, Samsung S24 Ultra
 * Uses modern caching strategies with versioned caches
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `nova-portal-${CACHE_VERSION}`;
const STATIC_CACHE = `nova-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `nova-dynamic-${CACHE_VERSION}`;
const FONT_CACHE = `nova-fonts-${CACHE_VERSION}`;
const IMAGE_CACHE = `nova-images-${CACHE_VERSION}`;

// Assets to cache on install (core app shell)
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png'
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first, fallback to cache - for HTML and API
  networkFirst: async (request) => {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  },

  // Cache first, fallback to network - for static assets
  cacheFirst: async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Update in background
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(STATIC_CACHE).then(cache => cache.put(request, networkResponse));
        }
      }).catch(() => {});
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      return new Response('Asset not available offline', { status: 503 });
    }
  },

  // Stale while revalidate - for fonts and images
  staleWhileRevalidate: async (request) => {
    const cachedResponse = await caches.match(request);
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

function getCacheForRequest(request) {
  const url = new URL(request.url);
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    return FONT_CACHE;
  }
  if (url.hostname.includes('cdnjs.cloudflare.com')) {
    return STATIC_CACHE;
  }
  if (request.destination === 'image') {
    return IMAGE_CACHE;
  }
  return DYNAMIC_CACHE;
}

function isExternalResource(request) {
  return EXTERNAL_RESOURCES.some(ext => request.url.startsWith(ext));
}

function shouldCacheFirst(request) {
  return request.destination === 'style' || 
         request.destination === 'script' ||
         request.destination === 'font' ||
         isExternalResource(request);
}

function shouldStaleWhileRevalidate(request) {
  return request.destination === 'font' || request.destination === 'image';
}

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[Nova Portal SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(FONT_CACHE).then(cache => {
        console.log('[Nova Portal SW] Caching external fonts');
        return cache.addAll(EXTERNAL_RESOURCES.filter(r => r.includes('fonts.googleapis.com')));
      }),
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(EXTERNAL_RESOURCES.filter(r => r.includes('cdnjs.cloudflare.com')));
      })
    ]).then(() => {
      console.log('[Nova Portal SW] Install complete');
      self.skipWaiting();
    }).catch(error => {
      console.error('[Nova Portal SW] Install failed:', error);
    })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('nova-') && 
            ![CACHE_NAME, STATIC_CACHE, DYNAMIC_CACHE, FONT_CACHE, IMAGE_CACHE].includes(name))
          .map(name => {
            console.log('[Nova Portal SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[Nova Portal SW] Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - route to appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http(s) schemes
  if (!request.url.startsWith('http')) return;
  
  // Skip if it's a range request (video/audio streaming)
  if (request.headers.has('Range')) return;

  const url = new URL(request.url);
  
  // Handle different strategies based on request type
  if (shouldStaleWhileRevalidate(request)) {
    event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
  } else if (shouldCacheFirst(request)) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
  } else {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-portal-data') {
    event.waitUntil(syncPortalData());
  }
});

async function syncPortalData() {
  // Implement background sync for any queued actions
  console.log('[Nova Portal SW] Background sync triggered');
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
  if (event.tag === 'refresh-portal-cache') {
    event.waitUntil(refreshCriticalCaches());
  }
});

async function refreshCriticalCaches() {
  try {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(STATIC_ASSETS.map(asset => 
      fetch(asset).then(r => r.ok && cache.put(asset, r))
    ));
    console.log('[Nova Portal SW] Critical caches refreshed');
  } catch (error) {
    console.error('[Nova Portal SW] Cache refresh failed:', error);
  }
}

// Handle push notifications (if enabled in future)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192-maskable.png',
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

console.log('[Nova Portal SW] Service Worker loaded - Modern PWA ready');