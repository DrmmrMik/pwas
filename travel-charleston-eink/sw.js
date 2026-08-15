// Charleston Travel Companion E-Ink Service Worker
const CACHE_NAME = 'chs-eink-v0.2.0';
const PRECACHE_ASSETS = ["./", "./index.html", "./assets/eink-DvpIjE8q.css", "./assets/eink-HNLSUKlN.js", "./assets/main-BMnE91H8.css", "./assets/main-lF6qn7ko.js", "./assets/settingsView-BBq9wn9R.js", "./assets/settingsView-Dgihpmma.css", "./icon-192.png", "./icon-192-maskable.png", "./icon-512.png", "./icon-512-maskable.png", "./icon.svg", "./manifest.json", "./manifest.webmanifest"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE_NAME).then(c => Promise.allSettled(PRECACHE_ASSETS.map(u => c.add(u).catch(err=>console.warn('sw skip',u,err))))).then(()=>self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', (e) => { if (e.request.method!=='GET') return; e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const cl=r.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,cl));return r;}).catch(()=>new Response('Offline',{status:503,statusText:'Offline'})))); });
