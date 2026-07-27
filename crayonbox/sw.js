const CACHE_NAME = 'crayonbox-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './css/book-carousel.css',
  './js/app.js',
  './js/render/paper-texture.js',
  './js/render/shaders.js',
  './js/render/webgl-engine.js',
  './js/input/pointer-handler.js',
  './js/input/gesture-detector.js',
  './js/audio/sound-engine.js',
  './js/db/storage.js',
  './assets/pages/page_001.svg',
  './assets/pages/page_002.svg',
  './assets/pages/page_003.svg',
  './assets/pages/page_004.svg',
  './assets/pages/page_005.svg',
  './assets/pages/page_006.svg',
  './assets/pages/page_007.svg',
  './assets/pages/page_008.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return cached || fetch(e.request);
    })
  );
});