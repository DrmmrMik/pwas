# CrayonBox PWA — Build Specification

Build a coloring book PWA called "CrayonBox" for iPad Pro with Apple Pencil support. The app must simulate real wax crayons using WebGL2 shaders, custom audio, and a zero-text child-friendly UI.

## Project Location
/home/gallabot/Documents/Gemini/CrayonBox/

## Directory Structure
```
CrayonBox/
├── index.html
├── manifest.webmanifest
├── sw.js
├── css/
│   ├── main.css
│   └── book-carousel.css
├── js/
│   ├── app.js
│   ├── render/
│   │   ├── webgl-engine.js
│   │   ├── shaders.js
│   │   └── paper-texture.js
│   ├── input/
│   │   ├── pointer-handler.js
│   │   └── gesture-detector.js
│   ├── audio/
│   │   └── sound-engine.js
│   └── db/
│       └── storage.js
└── assets/
    ├── audio/
    ├── textures/
    └── pages/
```

## Core Requirements

### 1. PWA Configuration
- Name: "CrayonBox", short_name: "CrayonBox"
- Standalone display, landscape orientation
- Background/theme color: #F4EAD5 (warm paper)
- Service worker pre-caches all assets
- iOS meta tags: apple-mobile-web-app-capable, viewport-fit=cover, user-scalable=no
- Splash screen and app icons (192x192, 512x512) using a simple crayon SVG icon

### 2. Rendering Engine (WebGL2)
- WebGL2 context with: alpha=false, depth=false, antialias=true, desynchronized=true
- Display P3 color space: gl.drawingBufferColorSpace = 'display-p3'
- 3-layer compositing: Paper texture (bottom) → WebGL pigment (middle) → SVG line art (top)
- Canvas resolution: 2732x2048 for iPad Pro 12.9"
- 120 FPS target using requestAnimationFrame

### 3. Crayon Shader (GLSL)
- Vertex shader receives: position, pressure, color, texCoord
- Fragment shader samples paper heightmap texture
- Wax coverage calculation: smoothstep(threshold, threshold+0.25, paperHeight + noise*0.15)
- threshold = 1.0 - (pressure * 0.85 + 0.10)
- Edge falloff: smoothstep(0.5, 0.2, distance from center)
- Subtractive color blending (not standard alpha):
  vec3 blendCrayonSubtractive(vec3 base, vec3 layer, float alpha) {
    vec3 baseSub = vec3(1.0) - base;
    vec3 layerSub = vec3(1.0) - layer;
    vec3 mixed = baseSub + (layerSub * alpha * 1.2);
    return vec3(1.0) - min(vec3(1.0), mixed);
  }
- Paper heightmap: 1024x1024 tileable texture (generate procedurally or use simplex noise)
- Wax accumulation tracking via secondary buffer

### 4. Pointer/Apple Pencil Handling
- Use Pointer Events API (pointerdown, pointermove, pointerup)
- pointerType === 'pen' for drawing, pointerType === 'touch' for UI
- e.getCoalescedEvents() for 120Hz sampling
- Palm rejection: discard touch points with contact area > 20px
- Single finger on canvas: ignored for drawing (prevents palm marks)
- Single finger on UI controls: selects crayon, navigates, triggers clear
- Pressure mapping: stroke width and wax density scale with pressure
- Tilt mapping: calculate total tilt angle from tiltX/tiltY, widen stroke when tilted
- Catmull-Rom spline interpolation for smooth strokes
- Perlin noise wobble on stroke edges: P_wobble(t) = C(t) + n(t) * [A_base * N(f*x, f*y) * (1.0 - 0.4*p(t))]
  where A_base=1.5px, f=0.08

### 5. Audio Engine (Web Audio API)
- Continuous friction sound: white noise → BiquadFilterNode(bandpass) → GainNode
- Gain scales with pressure: Gain(p) = min(1.0, p_current/p_max * 0.85 + 0.05)
- Filter frequency shifts with velocity: fc(v) = 600Hz + min(3000Hz, v * 1.5)
- Crayon "clack" sound on selection (synthesized, not sampled)
- Page turn sound on swipe
- All audio synthesized via Web Audio API (no external audio files needed)

### 6. UI Components
**Book Carousel (Page Selection):**
- 3D dual-page spread on warm wooden desktop background
- Swipe horizontally to flip pages with realistic page-turn animation
- Tapping right page zooms into coloring workspace
- Shows previously colored pages (thumbnails from IndexedDB)

**Crayon Palette:**
- 12 fixed crayon colors in a horizontal wooden tray at bottom
- Colors: Red, Orange, Yellow, Green, Teal, Blue, Purple, Pink, Brown, Black, Gray, White
- Tapping a crayon: lifts it 12px, plays "clack" sound
- Selected crayon shows wear on tip
- NO color pickers, NO hex inputs, NO sliders
- 72x72px minimum touch targets

**Canvas Workspace:**
- Page fills 85% of viewport
- Top-left: hand-drawn arrow pointing to book icon (back navigation)
- Top-right: trash bin icon (clear canvas)
- White crayon acts as eraser
- 1.5-second hold on trash icon to clear: circular progress ring fills, audio tone ascends 220Hz→440Hz
- Releasing before 1.5s cancels the clear
- Two-finger tap undo (v2, nice to have)

**Zero Text:** All UI is iconographic, no text labels needed

### 7. Persistence (IndexedDB)
- Database: CrayonBoxDB
- Object store 1: pages_meta (page_id, title, thumbnail_blob, last_modified, is_dirty)
- Object store 2: page_strokes (page_id, raster_blob, stroke_history)
- Auto-save after each stroke (debounced)
- Thumbnails at 683x512 for book carousel preview
- Request persistent storage: navigator.storage.persist()
- Monitor storage: navigator.storage.estimate(), warn at 80%

### 8. SVG Coloring Pages
Generate 8 SVG coloring pages appropriate for a 7-year-old:
1. Butterfly
2. Castle
3. Underwater scene (fish, bubbles)
4. Garden with flowers
5. Space rocket
6. Forest animals (bear, rabbit, fox)
7. Fairy tale princess
8. Dinosaur

Each SVG must:
- viewBox: 0 0 2048 1536 (4:3 aspect ratio for iPad)
- Line weight: 6-10pt for main outlines, min 3pt for details
- Closed paths only (no gaps)
- 12-18 discrete fill regions per page
- Stroke color: #1A1817 (warm dark charcoal, not harsh black)
- Fill: none, stroke-linecap: round, stroke-linejoin: round
- No fill regions smaller than 150x150px
- Keep it simple and charming for a 7yo

### 9. Paper Texture Generation
Generate a procedural paper heightmap texture (1024x1024):
- Use simplex noise or value noise to create paper grain
- Save as a canvas-generated PNG data URL or inline
- The texture should have subtle peaks and valleys

### 10. CSS Styling
- Fullscreen, no scrollbars, no text selection
- Warm wooden desktop background (#8B7355 or similar wood tone)
- Paper background: #F4EAD5
- Page turn animation with CSS transforms
- Crayon tray with recessed slots
- Smooth transitions on all interactions
- Touch-action: none to prevent browser gestures

## Build Order
1. Create index.html with all meta tags and PWA manifest link
2. Create manifest.webmanifest
3. Create sw.js (service worker with cache-first strategy)
4. Create CSS files (main.css, book-carousel.css)
5. Implement paper-texture.js (procedural heightmap generation)
6. Implement shaders.js (GLSL vertex + fragment shaders as strings)
7. Implement webgl-engine.js (WebGL2 context, rendering pipeline, stroke rendering)
8. Implement pointer-handler.js (Pointer Events, coalesced events, palm rejection, tilt/pressure)
9. Implement gesture-detector.js (page turn, tap, two-finger gestures)
10. Implement sound-engine.js (Web Audio API friction synthesis, clack, page turn)
11. Implement storage.js (IndexedDB CRUD, auto-save, thumbnail generation)
12. Implement app.js (main application orchestrator, state machine, book carousel, workspace)
13. Generate 8 SVG coloring pages
14. Test that everything works in a browser

## Publishing
After building, the app will be published to GitHub Pages at https://drmrmik.github.io/pwas/crayonbox/ using the existing PWA-Publisher tool at /home/gallabot/Documents/Gemini/PWA-Publisher/publish.js.

## Important Notes
- This is for a 7-year-old girl. Keep it simple, delightful, and frustration-free.
- Everything must work offline after initial load.
- No external dependencies, no CDN links, no frameworks. Vanilla JS only.
- The app must feel like a real coloring book, not a digital app.
- Test on an iPad Pro 12.9" (2732x2048) but also work on smaller iPads.