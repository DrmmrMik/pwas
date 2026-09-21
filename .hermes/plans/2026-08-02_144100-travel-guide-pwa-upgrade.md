# Travel Guide PWA — Interactive Map & Interest Features Implementation Plan

> **For Hermes:** Use subagent-driven-development to implement this plan task-by-task.

**Goal:** Upgrade the travel-guide-builder PWA template with an interactive map, interest/bookmark system, clipboard export, miles-based distances, touch-friendly price popups, and visible sourcing indicators.

**Architecture:** All changes are in the single `guide-template.html` file (JS + HTML + CSS). The `build_guide.py` script gets minor updates for miles conversion and Google Maps geocoding enrichment. No new external dependencies beyond the existing Leaflet/OSM stack. Google Maps API is used only in the builder script (research/geocoding step), not in the PWA itself — the PWA uses OSM tiles.

**Tech Stack:** Leaflet.js + OpenStreetMap (map in PWA), Google Maps API via `google_maps_client.py` (builder geocoding enrichment), HTML5 LocalStorage (interest tracking), Clipboard API (copy).

---
## Data layer changes

### New entry fields in data JSON

Add two optional fields to each entry — the build script sets these when Google Maps data is available; the template renders them when present:

```json
{
  "price_detail": "$ = under $15/pp, $$ = $15-30/pp, $$$ = $30-50/pp, $$$$ = $50+/pp",
  "source_detail": "Reddit r/Charleston",
  "rating": 4.5,
  "phone": "(843) 555-0100",
  "hours": "Mon-Sat 11am-9pm, Sun 12pm-8pm"
}
```

Existing fields that remain or get renamed:
- `meta.distance_from_hotel_km` → keep both `_km` and add `_mi`
- `sources` array stays; `source_detail` is a human-readable short string for inline display

---

## Task 1: Update build_guide.py — miles, price_detail, source_detail

**Objective:** Add miles conversion, price level descriptions, and source_detail mapping to the builder script.

**Files:**
- Modify: `~/.hermes/skills/travel/travel-guide-builder/scripts/build_guide.py`
- Test: verify against existing charleston-sc.json data

**Step 1: Add haversine_miles function + inject both units**

Add alongside `haversine_km`:

```python
def haversine_miles(lat1, lon1, lat2, lon2):
    """Haversine distance in miles."""
    return haversine_km(lat1, lon1, lat2, lon2) * 0.621371
```

In the distance injection block (line ~57), change to:

```python
if hotel and hotel.get("lat") is not None and hotel.get("lng") is not None:
    for entry in entries:
        if entry.get("lat") is not None and entry.get("lng") is not None:
            dist_km = haversine_km(hotel["lat"], hotel["lng"], entry["lat"], entry["lng"])
            dist_mi = haversine_miles(hotel["lat"], hotel["lng"], entry["lat"], entry["lng"])
            entry.setdefault("meta", {})["distance_from_hotel_km"] = round(dist_km, 1)
            entry.setdefault("meta", {})["distance_from_hotel_mi"] = round(dist_mi, 1)
```

**Step 2: Add price_detail mapping**

After distance injection, add:

```python
PRICE_MAP = {
    "$": "$ = under $15 per person",
    "$$": "$$ = $15–$30 per person",
    "$$$": "$$$ = $30–$50 per person",
    "$$$$": "$$$$ = $50+ per person",
}
for entry in entries:
    meta = entry.setdefault("meta", {})
    price = meta.get("price", "")
    if price in PRICE_MAP:
        meta["price_detail"] = PRICE_MAP[price]
```

**Step 3: Build with 2 sig-fig miles in template**

The HTML template receives both km and mi. The JS in the template will render miles by default with a toggle.

**Step 4: Run test**

```bash
cd ~/.hermes/projects/travel-guide-builder
python3 ~/.hermes/skills/travel/travel-guide-builder/scripts/build_guide.py charleston-sc data/charleston-sc.json
```

Verify output contains `distance_from_hotel_mi` in meta fields.

---

## Task 2: Rewrite guide-template.html — full interactivity

**Objective:** Overhaul the single HTML template with: interactive map (already has Leaflet — enhance), interest tracking, clipboard copy, miles display, touch-friendly price popups, source badges.

**Files:**
- Modify: `~/.hermes/skills/travel/travel-guide-builder/templates/guide-template.html`

### 2.1 Interest/bookmark system

Add a JavaScript interest store backed by localStorage:

```js
// Interest (bookmark) system
const STORAGE_KEY = 'tgb_interested_' + window.location.pathname;
function getInterested() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function setInterested(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
function toggleInterest(name) {
  const ids = getInterested();
  const idx = ids.indexOf(name);
  if (idx >= 0) ids.splice(idx, 1); else ids.push(name);
  setInterested(ids);
  render();
}
function isInterested(name) {
  return getInterested().includes(name);
}
```

Add a "⭐ Save" / "⭐ Saved" button to each card — differentiate from the existing kidPick star by using an outlined/empty star vs filled star icon:

```html
<button class="interest-btn ${isInterested(item.name) ? 'saved' : ''}" onclick="toggleInterest('${item.name.replace(/'/g, "\\'")}')">
  ${isInterested(item.name) ? '★' : '☆'}
</button>
```

### 2.2 Filter: show only interested

Add a tab/checkbox to the controls row:

```html
<label class="toggle-label"><input type="checkbox" id="interestOnly"> Saved only ★</label>
```

In `getFiltered()` add:
```js
if (interestOnly && !isInterested(item.name)) return false;
```

### 2.3 Clipboard copy of interested places

Add a button that appears when any items are saved:

```html
<button id="copyBtn" style="display:none; padding:8px 14px; border-radius:999px; border:1px solid var(--border); background:var(--accent); color:#fff; cursor:pointer; font-size:13px;">
  📋 Copy saved to clipboard
</button>
```

And its handler:

```js
document.getElementById('copyBtn').addEventListener('click', () => {
  const items = TRIP_DATA.filter(i => isInterested(i.name));
  const lines = items.map(i => {
    const dist = i.meta?.distance_from_hotel_mi
      ? ` (${i.meta.distance_from_hotel_mi} mi from hotel)`
      : '';
    const price = i.meta?.price || '';
    return `• ${i.name}${price ? ' [' + price + ']' : ''}${dist} — ${i.blurb}`;
  });
  const text = `Interested places — ${new Date().toLocaleDateString()}\n\n${lines.join('\n')}\n`;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.textContent = '✅ Copied!';
    setTimeout(() => { btn.textContent = '📋 Copy saved to clipboard'; }, 2000);
  });
});
```

### 2.4 Convert distances to miles (2 sig figs)

Replace `distance_from_hotel_km` references with `distance_from_hotel_mi`. Show as:

```js
`${item.meta.distance_from_hotel_mi} mi from hotel`
```

Also add a small km/mi toggle in the controls (default: mi):

```html
<label class="toggle-label">
  <input type="checkbox" id="unitToggle" checked> Show mi
</label>
```

The distance display checks the toggle:

```js
const unit = document.getElementById('unitToggle').checked ? 'mi' : 'km';
const distKey = unit === 'mi' ? 'distance_from_hotel_mi' : 'distance_from_hotel_km';
// In cardHtml:
const dist = item.meta && item.meta[distKey] != null
  ? `<span>${item.meta[distKey]} ${unit} from hotel</span>` : "";
```

### 2.5 Touch-friendly price popup

Replace the plain `$$$` span with a touchable element that shows a tooltip on tap (no hover dependency):

```html
<span class="price-tag" onclick="event.stopPropagation(); this.classList.toggle('show-tip')">
  ${item.meta.price}
  <span class="price-tip">${item.meta.price_detail || ''}</span>
</span>
```

CSS for the tooltip:

```css
.price-tag { position: relative; cursor: pointer; display: inline-flex; align-items: center; }
.price-tag .price-tip {
  display: none;
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  background: #1f2421; color: #fff; font-size: 12px; padding: 6px 10px;
  border-radius: 8px; white-space: nowrap; z-index: 10;
  margin-bottom: 6px;
}
.price-tag .price-tip::after {
  content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  border: 6px solid transparent; border-top-color: #1f2421;
}
.price-tag.show-tip .price-tip { display: block; }
```

The `onclick` toggle makes it work on mobile (tap to show, tap again to hide). Tap anywhere else (no `stopPropagation` on body) to dismiss.

### 2.6 Source badge indicators

Replace the generic source links with labeled badges that show WHERE the rec came from at a glance. A source with label `"r/Charleston thread"` gets a badge `Reddit`, `"NYT 36 Hours"` gets `NYT`, `"Charleston City Paper"` gets `Local Press`, etc.

Map known labels to short codes:

```js
const SOURCE_BADGE = {
  'reddit': { short: 'Reddit', color: '#ff4500' },
  'r/': { short: 'Reddit', color: '#ff4500' },
  'NYT': { short: 'NYT', color: '#1b1b1b' },
  'new york times': { short: 'NYT', color: '#1b1b1b' },
  'city paper': { short: 'Local', color: '#2f5d50' },
  'charleston magazine': { short: 'Local', color: '#2f5d50' },
  'rick steves': { short: 'Rick Steves', color: '#b5762b' },
  'chowhound': { short: 'Chowhound', color: '#6a4c93' },
  'tripadvisor': { short: 'TA', color: '#00af87' },
  'yelp': { short: 'Yelp', color: '#d32323' },
  'google': { short: 'Google', color: '#4285f4' },
  'blog': { short: 'Blog', color: '#6b6b66' },
  'travel': { short: 'Travel', color: '#1f2421' },
  'hotel': { short: 'Hotel', color: '#2f5d50' },
  'resort': { short: 'Hotel', color: '#2f5d50' },
  'dining guide': { short: 'Local', color: '#2f5d50' },
};

function getSourceBadge(label) {
  const lower = (label || '').toLowerCase();
  for (const [key, val] of Object.entries(SOURCE_BADGE)) {
    if (lower.includes(key)) return val;
  }
  return { short: 'Web', color: '#6b6b66' };
}
```

Render sources as:

```html
<div class="sources">
  ${(item.sources || []).map(s => {
    const badge = getSourceBadge(s.label);
    return `<a href="${s.url}" target="_blank" rel="noopener" class="source-badge" style="background:${badge.color}20;color:${badge.color}">${badge.short}</a>`;
  }).join("")}
</div>
```

### 2.7 Map view: show interest markers differently

On the map, interested markers get a different icon/color (e.g. gold star marker vs default blue). After `L.marker(...)`:

```js
if (isInterested(item.name)) {
  marker.setIcon(L.divIcon({
    className: 'interest-marker',
    html: '⭐',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  }));
}
```

### 2.8 Add "Interested only" to map view

When `interestOnly` is checked AND viewMode is "map", only show markers for interested items (plus the hotel marker always).

---

## Task 3: Update the manifest and SW (minor)

**Objective:** Bump SW cache version so users get the new template.

**Files:**
- Modify: `~/.hermes/skills/travel/travel-guide-builder/templates/sw-template.js`

No code changes needed — the `__CACHE_NAME__` placeholder already gets a build-stamp from `build_guide.py`, so any rebuild will naturally invalidate the old cache.

---

## Task 4: Rebuild and republish the Charleston guide

**Objective:** Verify all changes work end-to-end.

**Steps:**

1. Rebuild:
```bash
python3 ~/.hermes/skills/travel/travel-guide-builder/scripts/build_guide.py charleston-sc ~/.hermes/projects/travel-guide-builder/data/charleston-sc.json
```

2. Validate:
```bash
python3 ~/Documents/Gemini/PWA-Publisher/validate_pwa.py ~/.hermes/projects/travel-guide-builder/build/charleston-sc/
```

3. Publish:
```bash
node ~/Documents/Gemini/PWA-Publisher/publish.js travel-charleston-sc ~/.hermes/projects/travel-guide-builder/build/charleston-sc/
```

4. Verify live URL returns 200:
```
https://drmmrmik.github.io/pwas/travel-charleston-sc/
```

---

## Task 5: Update the travel-guide-builder skill SKILL.md

**Objective:** Document the Google Maps enrichment step in the run-instructions and the new template features.

**Files:**
- Modify: `~/.hermes/skills/travel/travel-guide-builder/SKILL.md`
- Modify: `~/.hermes/skills/travel/travel-guide-builder/references/run-instructions.md`

Add a §2.5 to run-instructions: after geocoding entries via Nominatim (step 5), run a Google Maps enrichment pass that calls `google_maps_client.py` for each entry to fill in:
- `rating` (if available)
- `phone`, `hours` (if available)
- More accurate lat/lng
- The `source_detail` field (e.g. "Reddit r/Charleston")

Also document the new template features: miles display, interest tracking, clipboard export, price popups, source badges.

---

## Task 6: Build a new travel guide to test end-to-end

**Objective:** Pick a small destination and run the full pipeline to verify everything works.

Pick a simple test destination (e.g. "Pittsburgh, PA" — already in memory as the user's home city) with a small data set (6-8 entries across categories) and run the full pipeline from research through publish.

---

## Testing / Validation

| What | How | Expected |
|---|---|---|
| Distance display | Check card HTML | `X.X mi from hotel` (2 sig figs) |
| Unit toggle | Click km/mi checkbox | Re-renders with km values |
| Interest save | Click ☆ on a card | Becomes ★, persists on reload |
| Interest filter | Check "Saved only" | Only saved items shown |
| Copy to clipboard | Click "Copy saved" | Clipboard has markdown list |
| Price tooltip | Tap a $$$ badge | Tooltip appears: "$$$ = $30–$50 per person" |
| Source badges | Check the sources area | Colored badges like "Reddit", "NYT", "Local" |
| Map interest icons | Switch to map, save a place | Place has ⭐ marker instead of default |
| PWA install | Open in browser, check manifest | Lighthouse: installable |

## Risks, Tradeoffs, & Open Questions

- **localStorage key collision:** The `STORAGE_KEY` uses the current pathname to scope. If the same slug is used for different trips, interested items would bleed. Acceptable for now — each guide has unique path.
- **Google Maps free tier:** The geocoding enrichment step in Task 5 calls Google Places API per entry. At 52 entries per guide, that's 52 Place Details calls (Essentials, 10K/mo free) — well within budget. But Text Search is Pro (5K/mo) and should be avoided; use Nearby Search or direct geocoding instead.
- **No backend:** Interest state is localStorage only. Clearing browser data loses it. This is intentional — no server needed.
- **Clipboard API:** Works on HTTPS and localhost. The published guide is served over HTTPS via GitHub Pages, so this is fine.
- **Mobile-first:** All new interactive elements (price popup tap, interest toggle, copy button) are designed for touch, not hover.