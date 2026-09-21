# ENGINEERING PLAN: Charleston PWA Fixes (App A & App B)

---

## 1. APP A — `travel-charleston-sc` (Canonical)  
**Target:** `~/.hermes/projects/travel-guide-builder` → builds to `pwas/travel-charleston-sc/index.html`  
**Issues:** 16 venues with `lat: null, lng: null`; Map tab renders no tiles/markers.

### 1.1 Extract & Audit Null-Coord Venues (One-time, manual)
1. Open `pwas/travel-charleston-sc/index.html` (or the builder template that generates the `venues` array).  
2. Locate the `const venues = [ … ]` array.  
3. Copy the **16 venue `name` strings** where `lat === null` into a temporary file `scripts/charleston-sc-null-venues.json`:
   ```json
   [
     "Venue Name 1",
     "Venue Name 2",
     ...
   ]
   ```

### 1.2 Add Build-Time Geocode Step (Nominatim, baked into `index.html`)
**New file:** `~/.hermes/projects/travel-guide-builder/scripts/geocode-charleston-sc.mjs`

```js
// geocode-charleston-sc.mjs
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'HermesTravelGuideBuilder/1.0 (drmmrmik.github.io)';
const RATE_LIMIT_MS = 1100; // 1 req/sec + margin
const CITY_CONTEXT = 'Charleston, SC'; // fallback for ambiguous names

async function geocode(name) {
  const q = `${name}, ${CITY_CONTEXT}`;
  const url = `${NOMINATIM_ENDPOINT}?format=json&limit=1&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function main() {
  const nullFile = path.resolve('scripts/charleston-sc-null-venues.json');
  const names = JSON.parse(fs.readFileSync(nullFile, 'utf8'));

  const results = {};
  for (const name of names) {
    try {
      const coords = await geocode(name);
      results[name] = coords;
      console.log(`✅ ${name} →`, coords);
    } catch (e) {
      console.error(`❌ ${name}:`, e.message);
      results[name] = null;
    }
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS));
  }

  // Write cache for inspection / re-run
  fs.writeFileSync('scripts/charleston-sc-geocoded.json', JSON.stringify(results, null, 2));
}
main();
```

**Integrate into builder pipeline**  
Edit the builder entry point (where `venues` array is assembled) to **import the baked coords**:

```js
// In travel-guide-builder build script (e.g. build.mjs or generate-html.mjs)
import baked from './scripts/charleston-sc-geocoded.json' assert { type: 'json' };

venues.forEach(v => {
  if (v.lat === null && v.lng === null && baked[v.name]) {
    v.lat = baked[v.name]?.lat ?? null;
    v.lng = baked[v.name]?.lng ?? null;
  }
});
```

**Run once now** to populate `charleston-sc-geocoded.json`, then commit the JSON file. Future builds are fully offline.

### 1.3 Fix Map Tab Rendering (Leaflet CSS/JS + Container)
**File:** `pwas/travel-charleston-sc/index.html` (or the template partial that emits the Map tab)

1. **Ensure Leaflet CSS loads before any map init**  
   ```html
   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
         integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
         crossorigin=""/>
   ```
2. **Guarantee `#map` container has explicit height**  
   ```html
   <div id="map" style="height: 100%; width: 100%; min-height: 400px;"></div>
   ```
   *If the Map tab is hidden via `display:none` on init*, add in `renderMap()`:
   ```js
   function renderMap() {
     const mapEl = document.getElementById('map');
     if (mapEl.offsetParent === null) { // tab hidden
       // wait for tab show event or force reflow
       setTimeout(() => map.invalidateSize(), 0);
     }
     // … existing init …
   }
   ```
3. **Tile layer attribution (required by OSM)**  
   ```js
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     maxZoom: 19,
     attribution: '© OpenStreetMap contributors'
   }).addTo(map);
   ```
4. **Marker rendering guard**  
   ```js
   function hasLocation(item) {
     return item.lat != null && item.lng != null &&
            !isNaN(item.lat) && !isNaN(item.lng);
   }
   venues.filter(hasLocation).forEach(v => L.marker([v.lat, v.lng]).addTo(map));
   ```

### 1.4 Per-Venue OSM Embed Fallback (for any remaining null-coord venues)
**In the venue detail view / list item template** (where `blurb` is rendered), add:
```js
function osmEmbedUrl(lat, lng, zoom = 15) {
  if (lat == null || lng == null) return null;
  const bbox = `${lng-0.01},${lat-0.005},${lng+0.01},${lat+0.005}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}
// In template:
{if (venue.lat != null) {
   `<iframe width="100%" height="200" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"
     src="${osmEmbedUrl(venue.lat, venue.lng)}" style="border:1px solid #ccc"></iframe>`
 }}
```
This works offline (no JS) and requires no API key.

---

## 2. APP B — `travel-charleston` (Vite/Tailwind) — E-Ink Nova Entry
**Target:** `~/Documents/Gemini/TravelCompanion` → builds to `pwas/travel-charleston/` + `pwas/travel-charleston/eink/`  
**Issue:** Nova directory (`pwas/projects.json`) only lists top-level folders; e-ink lives in subfolder.

### 2.1 Create Top-Level `travel-charleston-eink` Folder (PWA-Publisher layout)
**File:** `pwas/travel-charleston-eink/manifest.json`
```json
{
  "name": "Charleston Travel Companion (E-Ink)",
  "short_name": "CHS E-Ink",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
**File:** `pwas/travel-charleston-eink/index.html` → **copy** the built `dist/eink/index.html` from Vite output here (see 2.3).  
**Icons:** Copy `dist/eink/icon-192.png`, `dist/eink/icon-512.png` (or generate from source SVG).

### 2.2 Update Vite Multi-Page Build to Emit E-Ink Assets to *Both* Locations
**File:** `~/Documents/Gemini/TravelCompanion/vite.config.ts`
```ts
// Existing multi-page config …
build: {
  rollupOptions: {
    input: {
      main: 'index.html',
      eink: 'eink/index.html'
    }
  }
}
// ADD: copy plugin or post-build script to mirror eink build to publisher root
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  // …
  plugins: [
    // …
    {
      name: 'copy-eink-to-publisher',
      closeBundle() {
        const srcDir = resolve(__dirname, 'dist/eink');
        const destDir = resolve(__dirname, '../../pwas/travel-charleston-eink'); // relative to repo root
        if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
        ['index.html', 'icon-192.png', 'icon-512.png', 'assets'].forEach(f => {
          // simple recursive copy for assets dir
        });
      }
    }
  ]
});
```
*Simpler alternative:* Add an NPM script `postbuild: cp -r dist/eink/* ../../pwas/travel-charleston-eink/`.

### 2.3 Register in Nova Portal (`projects.json`)
**File:** `pwas/projects.json` (root of `drmmrmik.github.io/pwas/`)
```json
[
  "travel-charleston",
  "travel-charleston-sc",
  "travel-charleston-eink",
  "…other PWAs…"
]
```
Commit & push. The Nova portal (static `index.html` at `pwas/`) reads this array on load and fetches `./travel-charleston-eink/manifest.json` → card appears.

### 2.4 Deep-Link Verification
- Card `start_url` = `./index.html` → opens `https://drmmrmik.github.io/pwas/travel-charleston-eink/` (the e-ink SPA).
- If user prefers deep-link to subfolder, change `start_url` to `../travel-charleston/eink/index.html` **but** keep separate manifest so Nova shows distinct card.

---

## 3. BUILD / PUBLISH / TEST COMMAND SEQUENCE
```bash
# 0. Repo root
cd ~/github/drmmrmik.github.io   # or wherever pwas/ lives

# 1. APP A — Geocode bake (run once)
cd ~/.hermes/projects/travel-guide-builder
node scripts/geocode-charleston-sc.mjs   # produces scripts/charleston-sc-geocoded.json
# Verify 16 entries resolved → commit the JSON

# 2. APP A — Rebuild canonical index.html (builder script)
npm run build:charleston-sc   # or your builder command
# Output → pwas/travel-charleston-sc/index.html

# 3. APP B — Build Vite (main + eink)
cd ~/Documents/Gemini/TravelCompanion
npm run build                 # emits dist/ + dist/eink/
npm run postbuild             # copies eink → ../../pwas/travel-charleston-eink/

# 4. Publish both via PWA-Publisher
cd ~/github/drmmrmik.github.io
node publish.js               # reads projects.json, copies folders to gh-pages / pushes

# 5. Smoke test locally (optional)
npx serve pwas -p 8080
# Open http://localhost:8080/travel-charleston-sc/  → Map tab
# Open http://localhost:8080/travel-charleston-eink/ → E-ink
```

---

## 4. INTERACTION TEST CASES (Headless / Playwright)
**File:** `tests/charleston-sc-map.spec.ts`
```ts
import { test, expect } from '@playwright/test';

test('APP A Map tab renders tiles + all 61 markers', async ({ page }) => {
  await page.goto('https://drmmrmik.github.io/pwas/travel-charleston-sc/');
  await page.click('button:has-text("Map")');           // switch to Map tab
  await page.waitForSelector('#map .leaflet-container'); // Leaflet init

  // 1. Tile requests return 2xx
  const tileResponses = [];
  page.on('response', r => {
    if (r.url().includes('tile.openstreetmap.org')) tileResponses.push(r.status());
  });
  await page.waitForTimeout(2000); // allow tiles to load
  expect(tileResponses.every(s => s === 200