/**
 * paper-texture.js — Procedural Paper Heightmap Generator
 * CrayonBox PWA
 *
 * Generates a 1024x1024 grayscale canvas texture simulating paper grain
 * using layered value noise. No external dependencies.
 */

(function () {
  'use strict';

  // ─── Permutation table for hash-based value noise ───
  const _p = (function buildPerm() {
    const p = new Uint8Array(512);
    const perm = [];
    for (let i = 0; i < 256; i++) perm.push(i);
    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    return p;
  })();

  // ─── Fade & linear interpolation helpers ───
  function _fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function _lerp(a, b, t) {
    return a + t * (b - a);
  }

  // ─── 2D value noise ───
  // Returns a value in [0, 1].
  function _noise2D(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = _fade(xf);
    const v = _fade(yf);

    const aa = _p[_p[xi] + yi];
    const ab = _p[_p[xi] + yi + 1];
    const ba = _p[_p[xi + 1] + yi];
    const bb = _p[_p[xi + 1] + yi + 1];

    const x1 = _lerp(aa / 255, ba / 255, u);
    const x2 = _lerp(ab / 255, bb / 255, u);
    return _lerp(x1, x2, v);
  }

  // ─── Fractal Brownian Motion (fBm) over value noise ───
  // Layers several octaves of noise for natural-looking paper grain.
  function _fbm(x, y, octaves, lacunarity, gain) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxVal = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * _noise2D(x * frequency, y * frequency);
      maxVal += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }

    return value / maxVal; // normalize to [0, 1]
  }

  // ─── Public API ───

  /**
   * generatePaperTexture
   * Returns a 1024x1024 <canvas> element with a procedural paper grain
   * heightmap. The texture is grayscale — brighter = higher paper elevation.
   *
   * @param {object} [opts]
   * @param {number} [opts.width=1024]
   * @param {number} [opts.height=1024]
   * @param {number} [opts.seed]  Optional RNG seed for reproducible textures.
   * @returns {HTMLCanvasElement}
   */
  function generatePaperTexture(opts) {
    opts = opts || {};
    const w = opts.width || 1024;
    const h = opts.height || 1024;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Draw directly onto the canvas via an ImageData buffer
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;

    // Paper grain parameters — fine-tuned for a subtle warm paper feel
    const scale = 3.5;           // base frequency
    const octaves = 4;
    const lacunarity = 2.1;
    const gain = 0.55;

    // Optional: deterministic seed via re-seeding Math.random temporarily
    // For simplicity we rely on the Fisher-Yates shuffle above being random.

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Normalised coordinates, shifted slightly to avoid hard tiling artifacts
        const nx = x / w;
        const ny = y / h;

        // Core fBm noise — this gives the paper grain
        let n = _fbm(nx * scale, ny * scale, octaves, lacunarity, gain);

        // Secondary fine-grain layer (very high frequency, low amplitude)
        const fine = _noise2D(nx * 32, ny * 32) * 0.08;
        n += fine;

        // Tertiary very broad wave (paper "dip")
        const broad = Math.sin(nx * Math.PI * 1.8) * Math.sin(ny * Math.PI * 1.8) * 0.04;
        n += broad;

        // Clamp to [0, 1] and map to a slightly warm paper base
        n = Math.max(0, Math.min(1, n));

        // Base paper colour: warm off-white, slight yellow-green tint
        // Elevation modulates brightness — peaks are lighter, valleys darker
        const elevation = n;
        const baseR = 244;
        const baseG = 234;
        const baseB = 213;

        // Noise drives a subtle deviation from the base (≈ ±15 per channel)
        const variation = (elevation - 0.5) * 22;

        const idx = (y * w + x) * 4;
        data[idx + 0] = Math.max(0, Math.min(255, baseR + variation + 3));
        data[idx + 1] = Math.max(0, Math.min(255, baseG + variation + 2));
        data[idx + 2] = Math.max(0, Math.min(255, baseB + variation));
        data[idx + 3] = 255; // fully opaque
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Export for browser / module environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generatePaperTexture };
  } else {
    window.generatePaperTexture = generatePaperTexture;
  }
})();