---
name: pwa-standards
description: Best-in-class Progressive Web App (PWA) guidelines, templates, and patterns for building or refactoring mobile-friendly personal web applications.
---

# PWA Standards

Use this skill when creating, debugging, or editing Progressive Web Apps (PWAs) in this workspace. It ensures they feel like native apps on mobile devices (iOS/Android) and handle offline environments resiliently.

## 1. Web App Manifest (`manifest.json`)
Every PWA must have a `manifest.json` linked in the `<head>` of the main HTML file:
- **Mandatory properties**: `name`, `short_name`, `description`, `start_url`, `scope`, `display: "standalone"`, `background_color`, `theme_color`, and `orientation: "portrait"` (or `"any"` if responsive grid allows landscape).
- **Icons**: Standard icons (`192x192`, `512x512` PNG) along with explicitly defined `purpose: "any maskable"` versions. Provide an SVG icon with `sizes: "any"` for future-proofing.
- **Shortcuts**: Provide shortcuts for primary app tabs/actions to enable home screen quick actions.

## 2. Service Worker (`sw.js`)
Service workers must:
- Use a unique cache name (e.g. `const CACHE_NAME = 'app-cache-v1'`).
- Cache all local app shell files (HTML, CSS, JS, manifest, and icons) and static third-party scripts (fonts, icons libraries, CDN assets) during `install`.
- Clean up old cache storage versions during the `activate` event.
- Implement caching strategies on `fetch`:
  - **Stale-While-Revalidate**: For static local files and CDN dependencies to guarantee instant local start while fetching fresh assets in the background.
  - **Network-First**: For APIs or dynamic endpoints (like `/api/`), falling back to the cache if the network fails.
- Call `self.skipWaiting()` and `self.clients.claim()` to activate updates immediately.

## 3. HTML head Requirements
The HTML file MUST include the following tags:
- Viewport fit for notches: `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`
- Theme Color: `<meta name="theme-color" content="#theme-color-hex">`
- Legacy Apple support:
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` (Crucial for merging app header with status bar)
  - `<meta name="apple-mobile-web-app-title" content="App Short Name">`
  - `<link rel="apple-touch-icon" href="icons/icon-192.png">`
- Web Manifest: `<link rel="manifest" href="manifest.json">`

## 4. Mobile Native UX Styles (CSS)
In order to eliminate browser-like behaviors and present a premium native app feel, enforce the following CSS patterns:
- **No Elastic Scrolling (Rubber-banding)**: Prevent the main viewport from scrolling elastically on iOS by locking the `body` and making a sub-container scrollable.
  ```css
  html, body {
    height: 100%;
    margin: 0;
    overflow: hidden;
    overscroll-behavior: none;
  }
  .app-layout {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .scrollable-content {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  ```
- **Tap Highlights & Selection**: Disable standard selection highlights and tap gray overlays.
  ```css
  * {
    -webkit-tap-highlight-color: transparent;
  }
  button, a, .interactive {
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  ```
- **Notch Safe Areas**: Always respect notches and physical bezels using CSS environment variables:
  ```css
  .header {
    padding-top: env(safe-area-inset-top, 0px);
  }
  .bottom-nav {
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  ```

## 5. UI Lifecycle Registration (JS)
Include JS logic to:
- Handle service worker registration.
- Listen for `beforeinstallprompt` to display custom, styled in-app installation buttons rather than generic browser banners.
- Implement an update checker: notify the user with a prompt if a new version is waiting to install, and run `postMessage({ action: 'skipWaiting' })` to trigger the update when the user clicks 'Refresh'.
- Register connection listeners (`online` / `offline`) and toggle a visible header banner showing when connection is lost.
