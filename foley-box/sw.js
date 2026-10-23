// Foley Box service worker: app shell + sound clips cached for offline use.
const VERSION = "1.1.0";
const SHELL_CACHE = `foleybox-shell-${VERSION}`;
const AUDIO_CACHE = "foleybox-audio-v1"; // clips never change; keep across app versions
const FONT_CACHE = "foleybox-fonts-v1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./sounds.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/maskable-512.png",
  "./icons/maskable-192.png",
];

self.addEventListener("install", (e) => {
  // Cache each asset on its own so one missing file can never abort the install.
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("foleybox-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || new Response("Offline", { status: 503 });
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req, { cache: "no-cache" });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req, { ignoreSearch: true })) || new Response("Offline", { status: 503 });
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "upload.wikimedia.org") { e.respondWith(cacheFirst(req, AUDIO_CACHE)); return; }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") { e.respondWith(staleWhileRevalidate(req, FONT_CACHE)); return; }
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") {
      e.respondWith(fetch(req, { cache: "no-cache" }).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then((c) => c.put("./index.html", copy)); } return res; }).catch(() => caches.match("./index.html")));
      return;
    }
    e.respondWith(networkFirst(req, SHELL_CACHE)); // always run the newest published code when online
  }
});
