# Progressive Web App (PWA) Standards & Templates

This document outlines the best-in-class standards and copy-pasteable templates for creating and optimizing Progressive Web Apps (PWAs). Adhering to these patterns ensures your apps load instantly, work seamlessly offline, and deliver a premium, native-feeling user experience on both iOS and Android.

---

## 1. Web App Manifest (`manifest.json`)

The manifest configuration tells the mobile operating system how to display and launch your application.

```json
{
  "name": "App Full Title Name",
  "short_name": "AppShortName",
  "description": "A brief description of what the app does.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0b0e17",
  "theme_color": "#0b0e17",
  "orientation": "portrait",
  "categories": ["utilities", "productivity"],
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-192-maskable.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "icons/icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Dashboard",
      "url": "./index.html#dashboard",
      "icons": [{ "src": "icons/icon-192.png", "sizes": "192x192" }]
    }
  ]
}
```

### Best Practices:
* **Short Name**: Keep it under 12 characters to ensure it doesn't get truncated on mobile home screens.
* **Maskable Icons**: Android devices crop icons into circles, squares, or squircles. The `maskable` icon must have a safe zone (10% padding from all sides) to prevent the logo from getting clipped.
* **Orientation**: Use `"portrait"` for single-column utilities or `"any"` if the app layout adapts gracefully.

---

## 2. Service Worker (`sw.js`)

A production-grade service worker with cache version management, Stale-While-Revalidate for app assets, and Network-First for API requests.

```javascript
const CACHE_NAME = 'app-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/icon.svg',
  // Include static Google Fonts or CDN dependencies if used:
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap'
];

// Install: Cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch events handling
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests (e.g. POST, DELETE operations)
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy 1: Network-First for API routes or dynamic data
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Strategy 2: Stale-While-Revalidate for app assets & dependencies
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch updated asset in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {}); // silent catch if offline
          
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
  }
});

// Message listener to trigger skipWaiting on demand
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
```

---

## 3. HTML `<head>` Requirements

Ensure standard configurations and vendor specific meta tags are provided in your index.html.

```html
<!-- Character encoding and viewport settings -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">

<!-- PWA Manifest link -->
<link rel="manifest" href="manifest.json">

<!-- Universal theme colors -->
<meta name="theme-color" content="#0b0e17">

<!-- iOS Safari specific enhancements -->
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="AppShortName">
<link rel="apple-touch-icon" href="icons/icon-192.png">
```

### Explanations:
* `viewport-fit=cover`: Instructs Safari to extend the web page to fill the entire screen (behind status bar, home indicator, and side notches).
* `apple-mobile-web-app-status-bar-style`: Setting this to `black-translucent` merges the screen contents with the status bar. Ensure your header styling uses safe area padding to avoid overlaying status text.

---

## 4. Mobile Native UX Styles (CSS)

Add these rules to your stylesheet to mimic native application layout behaviors.

```css
/* 1. Prevent Elastic Rubber-Banding Scroll on Body */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden; /* Prevents viewport viewport-bouncing */
  overscroll-behavior: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #0b0e17;
  color: #ffffff;
}

/* 2. Establish Flex Layout Container */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

/* 3. Handle Scroll Container inside App */
.scroll-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* Kinetic scrolling for older iOS */
  overscroll-behavior-y: contain; /* Prevents scroll chain to parent */
}

/* 4. Disable Mobile Tap Overlays & Text Highlight */
* {
  -webkit-tap-highlight-color: transparent; /* Disable browser tap highlight */
}

button, a, .clickable {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none; /* Prevents context menu on long-press */
  touch-action: manipulation; /* Removes 300ms delay */
}

/* 5. Safe Area Inset Support */
header {
  padding-top: env(safe-area-inset-top, 0px);
}

footer, .bottom-navigation-bar {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

---

## 5. UI Lifecycle Registration (JS)

Include this registration block in your index.html or main application JS. It handles installation flows, service worker caching updates, and offline notifications.

```javascript
// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered successfully! Scope:', reg.scope);
        
        // Listen for updates in background
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification();
            }
          });
        });
      })
      .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
  });
  
  // Reload the page once the new service worker has taken control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}

// Custom In-App Install flow
let deferredPrompt;
const installBanner = document.getElementById('pwa-install-banner');
const installBtn = document.getElementById('btn-pwa-install');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent mini-infobar on Chrome Android
  e.preventDefault();
  deferredPrompt = e;
  
  // Show in-app install banner
  if (installBanner) {
    installBanner.classList.remove('hidden');
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    deferredPrompt = null;
    
    if (installBanner) {
      installBanner.classList.add('hidden');
    }
  });
}

// Connection Status Monitor
const offlineIndicator = document.getElementById('offline-indicator');

function updateOnlineStatus() {
  if (navigator.onLine) {
    if (offlineIndicator) offlineIndicator.classList.add('hidden');
  } else {
    if (offlineIndicator) offlineIndicator.classList.remove('hidden');
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus(); // run check on load

// Notification banner for newer content updates
function showUpdateNotification() {
  const updateAlert = document.createElement('div');
  updateAlert.className = 'update-alert-banner';
  updateAlert.innerHTML = `
    <div class="update-content">
      <span>A new version is available!</span>
      <button id="btn-update-refresh">Refresh</button>
    </div>
  `;
  document.body.appendChild(updateAlert);
  
  document.getElementById('btn-update-refresh').addEventListener('click', () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg.waiting) {
        reg.waiting.postMessage({ action: 'skipWaiting' });
      } else {
        window.location.reload();
      }
    });
  });
}
```
