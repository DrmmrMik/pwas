# PWA Standards — Modern Android 14+ / Samsung S24 Ultra Compliance Checklist

Every PWA we publish MUST pass `validate_pwa.py` before it is published. The
validator is the enforcement mechanism; this document is the spec.

A PWA fails install on modern Chrome/Android with **"Unsafe app blocked"** when
the service worker fails to install/activate (typically a 404'd precache asset)
or when required fields are missing. It warns **"built for an older version of
Android"** when a maskable icon is missing. The checklist below prevents both.

## 1. Transport & Hosting
- [ ] Served over **HTTPS** (GitHub Pages / valid TLS). No `http://` references anywhere.
- [ ] No **mixed content**: every `http://` reference in HTML/JS/CSS is upgraded or removed.
- [ ] `start_url` and `scope` resolve to real, existing files (no 404).

## 2. Web App Manifest (`manifest.json`)
- [ ] Valid JSON, parseable.
- [ ] `name` and `short_name` present (short_name ≤ 12 chars recommended).
- [ ] `start_url` present (e.g. `./index.html`).
- [ ] `scope` present and matches the app origin path.
- [ ] `display` is `standalone` or `fullscreen` (not `browser`).
- [ ] `display_override` includes `standalone` (modern hint).
- [ ] `background_color` present.
- [ ] `theme_color` present.
- [ ] `icons` array includes:
  - [ ] a **192px** icon (purpose `any`)
  - [ ] a **512px** icon (purpose `any`)
  - [ ] a **192px maskable** icon (purpose `maskable`)  ← REQUIRED for modern Android
  - [ ] a **512px maskable** icon (purpose `maskable`)  ← REQUIRED for modern Android
  - [ ] every `src` in `icons` resolves to a real file (HTTP 200 / local exists)
- [ ] (Recommended) `screenshots` for install prompt (at least 1 narrow + 1 wide).
- [ ] (Recommended) `shortcuts` for long-press menu.
- [ ] `prefer_related_applications` is `false` (do NOT prefer a native app).

## 3. Service Worker (`sw.js`)
- [ ] Registered in `index.html` (`navigator.serviceWorker.register(...)`).
- [ ] Parses with **no syntax errors** (`node --check`).
- [ ] `install` handler does **NOT** use a bare `cache.addAll([...])` that aborts on a
      single 404 — it caches assets individually and tolerates per-asset failures.
- [ ] Every entry in the SW precache list resolves to a **real file** (matches the
      build output layout — e.g. if build puts CSS/JS under `assets/`, the SW must
      reference `assets/style.css`, not `./style.css`). **MISMATCH = install failure.**
- [ ] `activate` handler calls `clients.claim()` and cleans old caches.
- [ ] `fetch` handler covers navigation requests (network-first or cache-first).

## 4. HTML
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">`.
- [ ] `<link rel="manifest" href="manifest.json">`.
- [ ] `<meta name="theme-color" ...>` present.
- [ ] No leftover `http://` external resources.

## 5. Icons
- [ ] All referenced icon files exist on disk / at their deployed URL.
- [ ] Maskable icons use full-bleed art with ~40% safe-zone padding (so Android's
      adaptive mask doesn't crop the subject).
- [ ] SVG icon (if used) is valid and self-contained.

## 6. Title Uniqueness & Variant Disambiguation
- [ ] `name` and `short_name` are **globally unique** across the PWA monorepo portfolio. No two apps may share the same title.
- [ ] Hardware-specific or mode-specific variants (e.g. **E-Ink** editions) MUST be explicitly disambiguated in both `name` and `short_name`:
  - Format: `<Base Title> (E-Ink)` (e.g. `Charleston Travel Companion (E-Ink)`, short: `CHS E-Ink`).
  - Never publish an E-Ink variant with the same title as its standard smartphone/desktop counterpart.

## 7. Portal Taxonomy & Tagging Standards
- [ ] Every PWA must declare at least one primary category in `manifest.json` `categories` adhering to the standard portal taxonomy:
  - `travel`: City guides, audio tours, itineraries, travel companions.
  - `games`: Educational games, math arcades, coloring books, classic games, scavenger hunts.
  - `utilities`: Fitness trackers, weather covariance analyzers, calculators, launcher tools.
- [ ] **E-Ink Tagging**: Applications designed for or optimized for E-Ink devices (e.g. viwoods AiPaper, KOReader, Kindle) MUST:
  - Include `"e-ink"` in the `categories` array (e.g. `["travel", "e-ink"]` or `["games", "e-ink"]`).
  - Deploy to a directory ending with `-eink` (e.g. `travel-charleston-eink`, `photoscavengerhunt-eink`).

## Enforcement
Run `python3 validate_pwa.py <pwa_build_dir>` BEFORE publishing. It exits non-zero
on any failure. `publish.js` / build steps MUST call it and abort on failure.

