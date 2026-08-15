#!/usr/bin/env python3
"""
validate_pwa.py - Pre-publish PWA compliance GATE (current Android / S24 Ultra).

Enforcement mechanism. Exits non-zero on ANY failure so the publish
pipeline (publish.js) can BLOCK shipping a PWA that Chrome rejects
with "Unsafe app blocked" (service-worker install failure) or
"built for an older version of Android" (WebAPK minting fell back to a
legacy install because the maskable icon was missing / not full-bleed,
or the manifest had experimental members it couldn't handle).

NOTE: a PWA is NOT compiled against an Android SDK level - "built for the
wrong Android version" is a category error. The warning is a Chrome/Samsung
WebAPK-minting fallback, not an SDK mismatch. User is on Android 16 / S24.

Root causes of "Unsafe app blocked" this gate catches (discovered
fixing two real PWAs):
  1. No service-worker registration in index.html
     (navigator.serviceWorker.register missing -> SW never installs).
  2. SW precache list references files that 404 (e.g. build puts
     CSS/JS under assets/ but SW precaches ./style.css -> install aborts).
  3. SW install uses a brittle cache.addAll([...]) that throws on a
     single 404 -> whole install rejected. Fix: cache each asset
     individually with .add().catch().

Root causes of "Built for an older version of Android" this gate catches:
  4. Maskable icon (purpose:"maskable") missing at 192 AND 512.
  5. Maskable PNG has a TRANSPARENT outer ring (not full-bleed) -> the
     WebAPK minting server rejects it and falls back to legacy. Must be
     full-bleed (opaque edge; art within central safe zone).
  6. Manifest contains experimental/desktop-only members
     (protocol_handlers, handle_links, edge_side_panel, launch_handler,
     window-controls-overlay in display_override) -> minting bails to legacy.

Usage:
  python3 validate_pwa.py <pwa_build_dir> [--base-url <url>]
The --base-url option ALSO verifies every icon src resolves over HTTP
(catches GitHub Pages / CDN deploy gaps after publish).
"""
import json
import os
import re
import sys
import urllib.request

ERRORS = []
WARNINGS = []


def err(msg):
    ERRORS.append(msg)


def warn(msg):
    WARNINGS.append(msg)


def load_manifest(d):
    p = os.path.join(d, "manifest.json")
    if not os.path.exists(p):
        err("manifest.json missing")
        return None
    try:
        return json.load(open(p))
    except Exception as e:
        err(f"manifest.json not valid JSON: {e}")
        return None


def load_html(d):
    p = os.path.join(d, "index.html")
    if not os.path.exists(p):
        err("index.html missing")
        return None
    return open(p, encoding="utf-8").read()


def load_sw(d):
    p = os.path.join(d, "sw.js")
    if not os.path.exists(p):
        err("sw.js missing")
        return None
    return open(p, encoding="utf-8").read()


def check_manifest(m, d):
    if m is None:
        return
    for key in ("name", "short_name", "start_url", "scope", "display",
                "background_color", "theme_color"):
        if not m.get(key):
            err(f"manifest missing required key: {key}")
    if m.get("display") in ("browser", None):
        err(f"manifest display must be standalone/fullscreen, got: {m.get('display')}")
    if "display_override" not in m:
        warn("manifest lacks display_override (recommended for modern Android)")
    if m.get("prefer_related_applications") is True:
        err("manifest prefer_related_applications must be false")
    icons = m.get("icons", []) or []
    if not icons:
        err("manifest has no icons")
    has = {"any192": False, "any512": False, "mask192": False, "mask512": False}
    for ic in icons:
        src = ic.get("src", "")
        pur = ic.get("purpose", "any")
        sz = str(ic.get("sizes", ""))
        is_mask = "maskable" in pur
        # SVG icons must NEVER be maskable: the WebAPK minter cannot
        # rasterize SVG for adaptive icons -> minting aborts -> legacy install.
        if is_mask and (src.lower().endswith(".svg")
                        or "svg" in str(ic.get("type", "")).lower()):
            err(f"SVG icon {src} declared purpose '{pur}' — SVG must be "
                "purpose:'any' only; maskable is PNG-only (WebAPK minter "
                "cannot rasterize SVG -> legacy fallback)")
        if "192" in sz and not is_mask:
            has["any192"] = True
        if "512" in sz and not is_mask:
            has["any512"] = True
        if "192" in sz and is_mask:
            has["mask192"] = True
        if "512" in sz and is_mask:
            has["mask512"] = True
    if not has["any192"]:
        err("no 192px 'any' icon")
    if not has["any512"]:
        err("no 512px 'any' icon")
    if not has["mask192"]:
        err("NO 192px MASKABLE icon -> WebAPK minting falls back to legacy "
            "install (Chrome warns 'built for an older version of Android')")
    if not has["mask512"]:
        err("NO 512px MASKABLE icon -> WebAPK minting falls back to legacy "
            "install (Chrome warns 'built for an older version of Android')")
    for ic in icons:
        src = ic.get("src", "")
        if not src:
            continue
        local = os.path.join(d, src.lstrip("./"))
        if not os.path.exists(local):
            err(f"manifest icon src does not exist on disk: {src}")
    # Maskable icons MUST be FULL-BLEED (opaque edge). A transparent outer
    # ring makes the WebAPK minting server reject the icon -> legacy fallback.
    for ic in icons:
        if "maskable" not in ic.get("purpose", ""):
            continue
        src = ic.get("src", "")
        local = os.path.join(d, src.lstrip("./"))
        if not os.path.exists(local):
            continue
        try:
            from PIL import Image
            im = Image.open(local).convert("RGBA")
            w, h = im.size
            px = im.load()
            margin = max(1, int(w * 0.08))
            ring = [px[x, y][3] for x in range(w) for y in range(h)
                    if x < margin or x >= w - margin or y < margin or y >= h - margin]
            transparent = [a for a in ring if a < 10]
            if transparent:
                err(f"maskable icon {src} has a TRANSPARENT outer ring "
                    f"({len(transparent)}/{len(ring)} edge px) - must be full-bleed "
                    "or WebAPK minting falls back to legacy install")
        except Exception as e:
            warn(f"could not inspect maskable icon {src}: {e}")
    # Experimental/desktop-only members can break WebAPK minting on Android.
    for risky in ("protocol_handlers", "handle_links", "edge_side_panel", "launch_handler"):
        if risky in m:
            err(f"manifest contains '{risky}' - strip it; it can cause WebAPK "
                "minting to fall back to a legacy (older-Android) install")
    if isinstance(m.get("display_override"), list) and any(
        x == "window-controls-overlay" for x in m["display_override"]
    ):
        err("display_override contains 'window-controls-overlay' - strip it for Android")
    if not m.get("screenshots"):
        warn("manifest has no screenshots (recommended for install prompt)")


def check_html(html):
    if html is None:
        return
    if "http://" in html:
        err("index.html contains insecure http:// reference (mixed content)")
    if 'rel="manifest"' not in html:
        err("index.html missing <link rel=manifest>")
    if 'name="viewport"' not in html:
        err("index.html missing viewport meta")
    elif "viewport-fit=cover" not in html:
        warn("viewport meta lacks viewport-fit=cover")
    if 'name="theme-color"' not in html:
        warn("index.html missing theme-color meta")
    if "serviceWorker.register" not in html:
        err("index.html does not register a service worker")


def check_sw(sw, d):
    if sw is None:
        return
    import subprocess
    r = subprocess.run(["node", "--check", os.path.join(d, "sw.js")],
                       capture_output=True, text=True)
    if r.returncode != 0:
        err(f"sw.js fails syntax check: {r.stderr.strip()[:200]}")
    if re.search(r"cache\.addAll\(", sw):
        err("sw.js uses cache.addAll() - a single 404 aborts install "
            "('Unsafe app blocked'). Cache assets individually with .add().catch().")
    asset_refs = set(re.findall(r"['\"]([^'\"]+\.(?:css|js|png|svg|webp|jpg|ico|html))['\"]", sw))
    for ref in asset_refs:
        if ref.startswith("http"):
            continue
        rel = ref.lstrip("./")
        local = os.path.join(d, rel)
        if not os.path.exists(local):
            err(f"sw.js precaches non-existent local asset: {ref} (-> {local})")


def check_live_icons(m, base_url):
    if m is None or not base_url:
        return
    for ic in m.get("icons", []):
        src = ic.get("src", "")
        if not src:
            continue
        url = base_url.rstrip("/") + "/" + src.lstrip("/")
        try:
            with urllib.request.urlopen(url, timeout=15) as r:
                if r.status != 200:
                    err(f"live icon not 200: {url} ({r.status})")
        except Exception as e:
            err(f"live icon fetch failed: {url} ({e})")


def main():
    if len(sys.argv) < 2:
        print("Usage: validate_pwa.py <pwa_build_dir> [--base-url <url>]")
        sys.exit(2)
    d = sys.argv[1]
    if not os.path.isdir(d):
        print(f"ERROR: not a directory: {d}")
        sys.exit(2)
    base_url = None
    if "--base-url" in sys.argv:
        i = sys.argv.index("--base-url") + 1
        if i < len(sys.argv):
            base_url = sys.argv[i]

    print(f"Validating PWA at: {d}\n")

    m = load_manifest(d)
    html = load_html(d)
    sw = load_sw(d)

    check_manifest(m, d)
    check_html(html)
    check_sw(sw, d)
    if base_url:
        check_live_icons(m, base_url)

    print("-" * 50)
    if ERRORS:
        print(f"FAILED - {len(ERRORS)} error(s):")
        for e in ERRORS:
            print(f"  X {e}")
    if WARNINGS:
        print(f"\n{len(WARNINGS)} warning(s):")
        for w in WARNINGS:
            print(f"  ! {w}")
    print("-" * 50)

    if ERRORS:
        print("RESULT: BLOCKED - do NOT publish until errors are fixed.")
        sys.exit(1)
    print("RESULT: PASS - safe to publish.")
    sys.exit(0)


if __name__ == "__main__":
    main()
