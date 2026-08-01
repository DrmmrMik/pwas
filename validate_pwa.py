#!/usr/bin/env python3
"""
validate_pwa.py — Pre-publish PWA compliance gate.

Checks a built PWA directory against PWA_STANDARDS.md. Exits non-zero on ANY
failure so the publish pipeline can block. This is the enforcement mechanism
that prevents shipping a PWA that Chrome rejects with "Unsafe app blocked"
(SW install failure) or "built for an older version of Android" (missing
maskable icon).

Usage:
  python3 validate_pwa.py <pwa_build_dir> [--base-url <url-to-check-icons-live>]

The --base-url option (optional) additionally verifies that icon files resolve
over HTTP (catches GitHub Pages deploy gaps). Without it, only local file
existence is checked (sufficient for pre-publish gating).
"""
import json
import os
import re
import sys
import urllib.request

# ─── result accumulator ──────────────────────────────────────────────────────
ERRORS = []
WARNINGS = []


def err(msg):
    ERRORS.append(msg)


def warn(msg):
    WARNINGS.append(msg)


# ─── load artifacts ───────────────────────────────────────────────────────────
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


# ─── checks ────────────────────────────────────────────────────────────────────
def check_manifest(m):
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
    # icons
    icons = m.get("icons", []) or []
    if not icons:
        err("manifest has no icons")
    has = {"any192": False, "any512": False, "mask192": False, "mask512": False}
    for ic in icons:
        src = ic.get("src", "")
        pur = ic.get("purpose", "any")
        sz = str(ic.get("sizes", ""))
        is_mask = "maskable" in pur
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
        err("NO 192px MASKABLE icon — Chrome/Samsung WebAPK minting falls back to a "
            "legacy install and warns 'built for an older version of Android'")
    if not has["mask512"]:
        err("NO 512px MASKABLE icon — Chrome/Samsung WebAPK minting falls back to a "
            "legacy install and warns 'built for an older version of Android'")
    # every icon src must exist locally
    for ic in icons:
        src = ic.get("src", "")
        if not src:
            continue
        local = os.path.join(d_root, src) if (d_root := globals().get("DIR")) else src
        if not os.path.exists(local):
            err(f"manifest icon src does not exist on disk: {src}")
    # Maskable icons MUST be FULL-BLEED (no transparent outer ring) or the
    # WebAPK minting server rejects them and falls back to legacy install.
    for ic in icons:
        if "maskable" not in ic.get("purpose", ""):
            continue
        src = ic.get("src", "")
        local = os.path.join(d_root, src) if (d_root := globals().get("DIR")) else src
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
                    f"({len(transparent)}/{len(ring)} edge px) — must be full-bleed "
                    "or WebAPK minting falls back to legacy install")
        except Exception as e:
            warn(f"could not inspect maskable icon {src}: {e}")
    # Experimental/desktop-only members can break WebAPK minting on Android.
    for risky in ("protocol_handlers", "handle_links", "edge_side_panel", "launch_handler"):
        if risky in m:
            err(f"manifest contains '{risky}' — strip it; it can cause WebAPK "
                "minting to fall back to a legacy (older-Android) install")
    if "display_override" in m and any(
        x == "window-controls-overlay" for x in m["display_override"]
    ):
        err("display_override contains 'window-controls-overlay' — strip it for Android")
    # Ideally provide screenshots for a richer install prompt
    if not m.get("screenshots"):
        warn("manifest has no screenshots (recommended for install prompt)")


def check_html(html):
    if html is None:
        return
    if 'http://' in html:
        err("index.html contains insecure http:// reference (mixed content)")
    if 'rel="manifest"' not in html:
        err("index.html missing <link rel=manifest>")
    if 'name="viewport"' not in html:
        err("index.html missing viewport meta")
    elif 'viewport-fit=cover' not in html:
        warn("viewport meta lacks viewport-fit=cover")
    if 'name="theme-color"' not in html:
        warn("index.html missing theme-color meta")
    if 'serviceWorker.register' not in html:
        err("index.html does not register a service worker")


def check_sw(sw, d):
    if sw is None:
        return
    # syntax
    import subprocess
    r = subprocess.run(["node", "--check", os.path.join(d, "sw.js")],
                       capture_output=True, text=True)
    if r.returncode != 0:
        err(f"sw.js fails syntax check: {r.stderr.strip()[:200]}")
    # brittle cache.addAll that aborts install on 404
    if re.search(r"cache\.addAll\s*\(", sw):
        err("sw.js uses cache.addAll() — a single 404 aborts install "
            "('Unsafe app blocked'). Cache assets individually with .add().catch().")
    # precache list entries must resolve to real files
    # find the STATIC_ASSETS-like array entries
    asset_refs = set(re.findall(r"['\"]([^'\"]+\.(?:css|js|png|svg|webp|jpg|ico|html))['\"]", sw))
    for ref in asset_refs:
        if ref.startswith("http"):
            continue  # external; .add().catch() handles these
        # normalise './x' -> 'x'
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


# ─── main ──────────────────────────────────────────────────────────────────────
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

    globals()["DIR"] = d
    print(f"Validating PWA at: {d}\n")

    m = load_manifest(d)
    html = load_html(d)
    sw = load_sw(d)

    check_manifest(m)
    check_html(html)
    check_sw(sw, d)
    if base_url:
        check_live_icons(m, base_url)

    print("─" * 50)
    if ERRORS:
        print(f"FAILED — {len(ERRORS)} error(s):")
        for e in ERRORS:
            print(f"  ✗ {e}")
    if WARNINGS:
        print(f"\n{len(WARNINGS)} warning(s):")
        for w in WARNINGS:
            print(f"  ! {w}")
    print("─" * 50)

    if ERRORS:
        print("RESULT: BLOCKED — do NOT publish until errors are fixed.")
        sys.exit(1)
    print("RESULT: PASS — safe to publish.")
    sys.exit(0)


if __name__ == "__main__":
    main()
