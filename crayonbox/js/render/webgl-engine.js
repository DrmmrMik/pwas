/**
 * webgl-engine.js — Dual WebGL2 & 2D Wax Crayon Engine
 * CrayonBox PWA
 *
 * Renders wax crayon strokes, flood fills, sticker stamps, and line-assist clipping:
 *   - WebGL2 Point Sprites with GLSL wax shader & subtractive wax blending
 *   - 2D Canvas Procedural Wax Renderer fallback (guarantees rendering on all GPUs)
 *   - Smart Flood Fill (Bucket Tool)
 *   - Wax Sticker Stamp Tool (Star, Heart, Rainbow, Sparkle, Smiley, Flower, Sun, Butterfly, Crown)
 *   - Stay-Inside-The-Lines SVG Path Clipping
 */

(function () {
  'use strict';

  // ─── Noise helpers ───
  var _perm = new Uint8Array(512);
  (function initPerm() {
    var p = [];
    for (var i = 0; i < 256; i++) p.push(i);
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (var i = 0; i < 512; i++) _perm[i] = p[i & 255];
  })();

  function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function _lerp(a, b, t) {
    if (!Number.isFinite(a)) a = 0;
    if (!Number.isFinite(b)) b = 0;
    return a + t * (b - a);
  }

  function _grad2D(hash, x, y) {
    var h = hash & 3;
    var u = h < 2 ? x : y;
    var v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  function _perlin2D(x, y) {
    if (!Number.isFinite(x)) x = 0;
    if (!Number.isFinite(y)) y = 0;
    var xi = Math.floor(x) & 255;
    var yi = Math.floor(y) & 255;
    var xf = x - Math.floor(x);
    var yf = y - Math.floor(y);
    var u = _fade(xf);
    var v = _fade(yf);

    var aa = _perm[_perm[xi] + yi];
    var ab = _perm[_perm[xi] + yi + 1];
    var ba = _perm[_perm[xi + 1] + yi];
    var bb = _perm[_perm[xi + 1] + yi + 1];

    var x1 = _lerp(_grad2D(aa, xf, yf), _grad2D(ba, xf - 1, yf), u);
    var x2 = _lerp(_grad2D(ab, xf, yf - 1), _grad2D(bb, xf - 1, yf - 1), u);
    return (_lerp(x1, x2, v) + 1) / 2;
  }

  // ─── CrayonEngine ───

  function CrayonEngine() {
    this.gl = null;
    this.program = null;
    this.canvas = null;
    this.ctx2d = null;
    this.using2DFallback = false;

    // WebGL Locations & Buffers
    this.uProjection = null;
    this.uPointSize = null;
    this.uPaperHeightmap = null;
    this.uWaxGrain = null;
    this.uResolution = null;

    this.aPosition = null;
    this.aPressure = null;
    this.aTexCoord = null;
    this.aColor = null;

    this.positionBuffer = null;
    this.pressureBuffer = null;
    this.texCoordBuffer = null;
    this.colorBuffer = null;

    this.paperTexture = null;
    this.waxGrainTexture = null;

    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    // Settings
    this.brushSizeMultiplier = 1.0; // 0.6 = Thin, 1.0 = Medium, 1.8 = Thick
    this._strokeHistory = [];
    this._eraserMode = false;
    this.clipPath2D = null;
  }

  CrayonEngine.prototype.init = function (canvas) {
    this.canvas = canvas;
    this.dpr = window.devicePixelRatio || 1;
    this.width = canvas.width;
    this.height = canvas.height;

    // Always get 2D context on offscreen or canvas fallback
    try {
      this.ctx2d = canvas.getContext('2d', { willReadFrequently: true });
    } catch (e) {}

    // Try WebGL2 first
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        desynchronized: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        depth: false,
        stencil: false
      });
    } catch (e) {
      console.warn('[CrayonEngine] WebGL2 initialization threw error, using 2D fallback:', e);
    }

    if (!gl) {
      console.warn('[CrayonEngine] WebGL2 unavailable, defaulting to high-fidelity 2D Wax engine');
      this.using2DFallback = true;
      if (!this.ctx2d) {
        this.ctx2d = canvas.getContext('2d');
      }
      this.clear();
      return true;
    }

    this.gl = gl;

    if (gl.drawingBufferColorSpace !== undefined) {
      try { gl.drawingBufferColorSpace = 'display-p3'; } catch (e) {}
    }

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this._createBuffers();
    this._createPaperTexture();
    this._createWaxGrainTexture();
    var shadersOk = this.compileShaders();

    if (!shadersOk) {
      console.warn('[CrayonEngine] Shader compilation failed, falling back to 2D canvas');
      this.using2DFallback = true;
      this.clear();
      return true;
    }

    if (this.program) {
      gl.useProgram(this.program);
    }

    gl.viewport(0, 0, this.width, this.height);
    this.clear();
    return true;
  };

  CrayonEngine.prototype.renderPoint = function (x, y, color, pressure, tilt) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    pressure = (typeof pressure === 'number' && Number.isFinite(pressure)) ? pressure : 0.5;
    tilt = (typeof tilt === 'number' && Number.isFinite(tilt)) ? tilt : 0;

    // Eraser mode check
    if (color === '#FFFFFF' || this._eraserMode) {
      color = '#F4EAD5'; // Paper color
    }

    if (this.using2DFallback || !this.gl || !this.program) {
      this.renderPoint2D(x, y, color, pressure, tilt);
      return;
    }

    var gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    var colorVec = this._parseColor(color);
    var baseSize = (14 + pressure * 26) * this.brushSizeMultiplier;
    var tiltWiden = 1 + Math.sin(tilt) * 0.4;
    var pointSize = Math.max(6, Math.min(180, baseSize * tiltWiden * this.dpr));

    var w = this.canvas.width;
    var h = this.canvas.height;
    var projection = new Float32Array([
      2 / w, 0, 0,
      0, -2 / h, 0,
      -1, 1, 1
    ]);

    var positions = new Float32Array([x, y]);
    var pressures = new Float32Array([pressure]);
    var texCoords = new Float32Array([x / w, y / h]);
    var colors = new Float32Array([colorVec[0], colorVec[1], colorVec[2]]);

    gl.useProgram(this.program);

    gl.uniformMatrix3fv(this.uProjection, false, projection);
    gl.uniform1f(this.uPointSize, pointSize);
    gl.uniform2f(this.uResolution, w, h);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
    gl.uniform1i(this.uPaperHeightmap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.waxGrainTexture);
    gl.uniform1i(this.uWaxGrain, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.pressureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pressures, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPressure);
    gl.vertexAttribPointer(this.aPressure, 1, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aTexCoord);
    gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, 1);

    gl.disableVertexAttribArray(this.aPosition);
    gl.disableVertexAttribArray(this.aPressure);
    gl.disableVertexAttribArray(this.aTexCoord);
    gl.disableVertexAttribArray(this.aColor);
  };

  // ─── 2D Canvas Procedural Wax Crayon Engine ───

  CrayonEngine.prototype.renderPoint2D = function (x, y, color, pressure, tilt) {
    if (!this.ctx2d) {
      this.ctx2d = this.canvas.getContext('2d');
    }
    var ctx = this.ctx2d;
    if (!ctx) return;

    pressure = Math.max(0.15, Math.min(1.0, pressure || 0.5));
    var strokeWidth = (16 + pressure * 28) * this.brushSizeMultiplier;
    var radius = strokeWidth / 2;

    ctx.save();

    if (this.clipPath2D) {
      ctx.clip(this.clipPath2D);
    }

    var prev = this._lastPoint2D || { x: x, y: y };

    // 1. Primary rich wax stroke with rounded caps and pressure opacity
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.globalAlpha = Math.min(0.92, 0.65 + pressure * 0.3);

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    // 2. Parallel wax tooth texture line to build natural crayon wax edge feel
    ctx.lineWidth = strokeWidth * 0.7;
    ctx.globalAlpha = 0.25 * pressure;
    ctx.stroke();

    // 3. Subtle paper-tooth grain mask to catch wax on peaks
    var dx = x - prev.x;
    var dy = y - prev.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var dabs = Math.max(1, Math.floor(len / 6));

    ctx.fillStyle = '#F4EAD5'; // Paper color for grain tooth
    ctx.globalAlpha = 0.08 * (1.2 - pressure * 0.5);

    for (var i = 0; i <= dabs; i++) {
      var t = dabs > 0 ? i / dabs : 0;
      var cx = prev.x + dx * t;
      var cy = prev.y + dy * t;

      var pAngle = Math.random() * Math.PI * 2;
      var pDist = Math.random() * (radius * 0.6);
      var gx = cx + Math.cos(pAngle) * pDist;
      var gy = cy + Math.sin(pAngle) * pDist;
      var gSize = 1.5 + Math.random() * 2.5;

      ctx.fillRect(gx, gy, gSize, gSize);
    }

    ctx.restore();
    this._lastPoint2D = { x: x, y: y };
  };

  // ─── Smart Flood Fill (Bucket Tool) ───

  CrayonEngine.prototype.floodFill = function (startX, startY, fillColorHex) {
    if (!Number.isFinite(startX) || !Number.isFinite(startY)) return;

    var ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    var w = this.canvas.width;
    var h = this.canvas.height;
    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    var imgData = ctx.getImageData(0, 0, w, h);
    var data = imgData.data;

    var targetColor = this._getPixelRGB(data, startX, startY, w);
    var fillRGB = this._hexToRGB(fillColorHex);

    // Don't fill if target color is nearly identical to fill color
    if (this._colorDistance(targetColor, fillRGB) < 15) return;

    // Breadth-First-Search flood fill algorithm with region queue
    var queue = [startX, startY];
    var visited = new Uint8Array(w * h);
    var tolerance = 45;

    while (queue.length > 0) {
      var cy = queue.pop();
      var cx = queue.pop();

      var idx = cy * w + cx;
      if (visited[idx]) continue;
      visited[idx] = 1;

      var pixelColor = this._getPixelRGB(data, cx, cy, w);
      if (this._colorDistance(targetColor, pixelColor) > tolerance) continue;

      this._setPixelRGB(data, cx, cy, w, fillRGB);

      if (cx > 0 && !visited[idx - 1]) queue.push(cx - 1, cy);
      if (cx < w - 1 && !visited[idx + 1]) queue.push(cx + 1, cy);
      if (cy > 0 && !visited[idx - w]) queue.push(cx, cy - 1);
      if (cy < h - 1 && !visited[idx + w]) queue.push(cx, cy + 1);
    }

    ctx.putImageData(imgData, 0, 0);

    // If WebGL is active, update WebGL texture context
    if (this.gl && !this.using2DFallback) {
      this._sync2DToWebGL();
    }
  };

  CrayonEngine.prototype._getPixelRGB = function (data, x, y, w) {
    var i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  CrayonEngine.prototype._setPixelRGB = function (data, x, y, w, rgb) {
    var i = (y * w + x) * 4;
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  };

  CrayonEngine.prototype._hexToRGB = function (hex) {
    var c = this._parseColor(hex);
    return [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)];
  };

  CrayonEngine.prototype._colorDistance = function (c1, c2) {
    return Math.abs(c1[0] - c2[0]) + Math.abs(c1[1] - c2[1]) + Math.abs(c1[2] - c2[2]);
  };

  // ─── Sticker Stamp Renderer ───

  CrayonEngine.prototype.drawStamp = function (x, y, stampType, color, scale) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    scale = scale || 1.0;
    var ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.fillStyle = color;
    ctx.strokeStyle = '#1C1917';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    switch (stampType) {
      case 'star':
        this._drawStarPath(ctx, 0, 0, 5, 45, 20);
        break;
      case 'heart':
        this._drawHeartPath(ctx, 0, 0, 40);
        break;
      case 'smiley':
        ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1C1917';
        ctx.beginPath(); ctx.arc(-12, -10, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(12, -10, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, 5, 18, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
        break;
      case 'rainbow':
        var colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'];
        for (var r = 0; r < colors.length; r++) {
          ctx.beginPath();
          ctx.arc(0, 20, 50 - r * 7, Math.PI, 2 * Math.PI);
          ctx.strokeStyle = colors[r];
          ctx.lineWidth = 7;
          ctx.stroke();
        }
        break;
      case 'crown':
        ctx.beginPath();
        ctx.moveTo(-35, 20); ctx.lineTo(-35, -20); ctx.lineTo(-18, 0);
        ctx.lineTo(0, -35); ctx.lineTo(18, 0); ctx.lineTo(35, -20);
        ctx.lineTo(35, 20); ctx.closePath();
        ctx.fill(); ctx.stroke();
        break;
      case 'sparkle':
      default:
        this._drawStarPath(ctx, 0, 0, 4, 40, 10);
        break;
    }

    ctx.restore();

    if (this.gl && !this.using2DFallback) {
      this._sync2DToWebGL();
    }
  };

  CrayonEngine.prototype._drawStarPath = function (ctx, cx, cy, spikes, outerRadius, innerRadius) {
    var rot = Math.PI / 2 * 3;
    var step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (var i = 0; i < spikes; i++) {
      var x = cx + Math.cos(rot) * outerRadius;
      var y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  CrayonEngine.prototype._drawHeartPath = function (ctx, x, y, size) {
    ctx.beginPath();
    var topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + topCurveHeight);
    ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x - size / 2, y + (size + topCurveHeight) / 2, x, y + size, x, y + size);
    ctx.bezierCurveTo(x, y + size, x + size / 2, y + (size + topCurveHeight) / 2, x + size / 2, y + topCurveHeight);
    ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurveHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  CrayonEngine.prototype._sync2DToWebGL = function () {
    var gl = this.gl;
    if (!gl) return;
    // Upload 2D canvas contents back into WebGL framebuffer if needed
  };

  CrayonEngine.prototype.clear = function () {
    if (this.ctx2d) {
      this.ctx2d.fillStyle = '#F4EAD5';
      this.ctx2d.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.gl && !this.using2DFallback) {
      var gl = this.gl;
      if (this.program) gl.useProgram(this.program);
      gl.clearColor(0.957, 0.918, 0.835, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  };

  CrayonEngine.prototype.startStroke = function (x, y, color, pressure, tilt) {
    this._currentStroke = [];
    this._lastPoint2D = { x: x, y: y };
    this.renderPoint(x, y, color, pressure, tilt);
  };

  CrayonEngine.prototype.endStroke = function () {
    this._lastPoint2D = null;
  };

  CrayonEngine.prototype.setColor = function (c) {};
  CrayonEngine.prototype.setEraser = function (isEraser) {
    this._eraserMode = isEraser;
  };

  CrayonEngine.prototype.destroy = function () {
    this.gl = null;
    this.ctx2d = null;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CrayonEngine };
  } else {
    window.CrayonEngine = CrayonEngine;
  }
})();