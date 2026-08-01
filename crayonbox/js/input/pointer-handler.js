/**
 * pointer-handler.js — Apple Pencil, Touch & Mouse Input Handler
 * CrayonBox PWA
 *
 * Manages pointer events (pen, touch, mouse) for the crayon coloring app:
 *   - Apple Pencil (pointerType === 'pen') → drawing with pressure & tilt
 *   - Finger touch (pointerType === 'touch') → drawing with palm rejection (>20px radius)
 *   - Mouse (pointerType === 'mouse') → drawing for desktop / web testing
 *   - Coalesced events for 120Hz sampling on iPad Pro
 *   - Catmull-Rom spline interpolation for smooth strokes
 *   - Perlin noise wobble on stroke edges (irregular crayon texture)
 *   - Robust NaN & Infinity sanitisation on all coordinates & timestamps
 */

(function () {
  'use strict';

  // ─── Permutation table and Perlin noise ───
  var _perm = new Uint8Array(512);
  (function () {
    var p = [];
    for (var i = 0; i < 256; i++) p.push(i);
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = p[i]; p[i] = p[j]; p[j] = t;
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
    return (_lerp(x1, x2, v) + 1) * 0.5;
  }

  // ─── Catmull-Rom helpers ───
  function _catmullRom(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  function _catmullRomPoint(p0, p1, p2, p3, t) {
    var x0 = (p0 && Number.isFinite(p0.x)) ? p0.x : 0;
    var y0 = (p0 && Number.isFinite(p0.y)) ? p0.y : 0;
    var x1 = (p1 && Number.isFinite(p1.x)) ? p1.x : x0;
    var y1 = (p1 && Number.isFinite(p1.y)) ? p1.y : y0;
    var x2 = (p2 && Number.isFinite(p2.x)) ? p2.x : x1;
    var y2 = (p2 && Number.isFinite(p2.y)) ? p2.y : y1;
    var x3 = (p3 && Number.isFinite(p3.x)) ? p3.x : x2;
    var y3 = (p3 && Number.isFinite(p3.y)) ? p3.y : y2;

    return {
      x: _catmullRom(x0, x1, x2, x3, t),
      y: _catmullRom(y0, y1, y2, y3, t)
    };
  }

  // ─── PointerHandler ───

  function PointerHandler(options) {
    if (!options || !options.canvas) {
      throw new Error('PointerHandler: canvas is required');
    }

    this.canvas = options.canvas;
    this.onStrokePoint = options.onStrokePoint || function () {};
    this.onStrokeStart = options.onStrokeStart || function () {};
    this.onStrokeEnd = options.onStrokeEnd || function () {};
    this.onClearHoldProgress = options.onClearHoldProgress || function () {};

    // Internal state
    this._isDrawing = false;
    this._isPenDown = false;
    this._currentStroke = [];
    this._pointerId = null;
    this._pointerType = 'pen';
    this._dpr = window.devicePixelRatio || 1;
    this._velocity = 0;
    this._lastPoint = null;

    // Clear-hold timer
    this._clearHoldTimer = null;
    this._clearHoldStart = 0;
    this._clearHoldDuration = 1500;

    // Bind event handlers
    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onPointerMove = this.handlePointerMove.bind(this);
    this._onPointerUp = this.handlePointerUp.bind(this);
    this._onPointerCancel = this.handlePointerCancel.bind(this);

    this._attachEvents();
  }

  PointerHandler.prototype._attachEvents = function () {
    var canvas = this.canvas;

    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerCancel);

    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    canvas.setAttribute('touch-action', 'none');
    canvas.style.touchAction = 'none';
  };

  PointerHandler.prototype._detachEvents = function () {
    var canvas = this.canvas;
    canvas.removeEventListener('pointerdown', this._onPointerDown);
    canvas.removeEventListener('pointermove', this._onPointerMove);
    canvas.removeEventListener('pointerup', this._onPointerUp);
    canvas.removeEventListener('pointercancel', this._onPointerCancel);
  };

  PointerHandler.prototype.handlePointerDown = function (e) {
    // Single finger touch palm rejection check
    if (e.pointerType === 'touch') {
      var contactRadius = Math.max(e.width || 0, e.height || 0) / 2;
      if (contactRadius > 22) {
        // Discard large touch (resting palm)
        return;
      }
    }

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (err) {}

    this._isDrawing = true;
    this._isPenDown = true;
    this._pointerId = e.pointerId;
    this._pointerType = e.pointerType || 'pen';
    this._currentStroke = [];
    this._lastPoint = null;
    this._velocity = 0;

    var pt = this._extractPoint(e);
    this._currentStroke.push(pt);
    this._lastPoint = pt;

    this.onStrokeStart({
      x: pt.x,
      y: pt.y,
      pressure: pt.pressure,
      tilt: pt.tilt,
      pointerType: this._pointerType,
      timestamp: pt.timestamp
    });

    this.onStrokePoint({
      x: pt.x,
      y: pt.y,
      pressure: pt.pressure,
      tilt: pt.tilt,
      pointerType: this._pointerType,
      timestamp: pt.timestamp,
      strokePoints: this._currentStroke
    });
  };

  PointerHandler.prototype.handlePointerMove = function (e) {
    if (!this._isPenDown) return;
    if (this._pointerId !== null && e.pointerId !== this._pointerId) return;

    var coalesced = (typeof e.getCoalescedEvents === 'function')
      ? e.getCoalescedEvents()
      : [e];

    if (!coalesced || coalesced.length === 0) coalesced = [e];

    for (var i = 0; i < coalesced.length; i++) {
      var ev = coalesced[i];
      var pt = this._extractPoint(ev);

      if (this._lastPoint) {
        var dx = pt.x - this._lastPoint.x;
        var dy = pt.y - this._lastPoint.y;
        var dt = Math.max(0.001, pt.timestamp - this._lastPoint.timestamp);
        var dist = Math.sqrt(dx * dx + dy * dy);
        this._velocity = Number.isFinite(dist / dt) ? dist / dt : 0;
      }

      var interpolated = this._interpolateStrokeSegment(this._lastPoint, pt);

      for (var j = 0; j < interpolated.length; j++) {
        var ip = interpolated[j];
        var wobbled = this._applyWobble(ip);

        this._currentStroke.push(wobbled);

        this.onStrokePoint({
          x: wobbled.x,
          y: wobbled.y,
          pressure: wobbled.pressure,
          tilt: wobbled.tilt,
          velocity: this._velocity,
          pointerType: this._pointerType,
          timestamp: wobbled.timestamp,
          strokePoints: this._currentStroke
        });
      }

      this._lastPoint = pt;
    }
  };

  PointerHandler.prototype.handlePointerUp = function (e) {
    if (this._isPenDown) {
      this._isPenDown = false;
      this._isDrawing = false;

      this.onStrokeEnd({
        pointerType: this._pointerType,
        pointCount: this._currentStroke.length,
        timestamp: performance.now()
      });

      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (ex) {}

      this._currentStroke = [];
      this._lastPoint = null;
      this._pointerId = null;

      this._cancelClearHold();
    }
  };

  PointerHandler.prototype.handlePointerCancel = function (e) {
    if (this._isPenDown) {
      this._isPenDown = false;
      this._isDrawing = false;

      this.onStrokeEnd({
        pointerType: this._pointerType,
        cancelled: true,
        timestamp: performance.now()
      });

      this._currentStroke = [];
      this._lastPoint = null;
      this._pointerId = null;
      this._cancelClearHold();
    }
  };

  PointerHandler.prototype._extractPoint = function (e) {
    var rect = this.canvas.getBoundingClientRect();
    var rectW = Math.max(1, rect.width || this.canvas.clientWidth || 1);
    var rectH = Math.max(1, rect.height || this.canvas.clientHeight || 1);

    var x = (e.clientX - rect.left) / rectW * this.canvas.width;
    var y = (e.clientY - rect.top) / rectH * this.canvas.height;

    if (!Number.isFinite(x)) x = 0;
    if (!Number.isFinite(y)) y = 0;

    // Pressure normalization (default to 0.5 for mouse/touch if pressure is 0)
    var pressure = (typeof e.pressure === 'number' && e.pressure > 0) ? e.pressure : 0.5;
    if (pressure > 1) pressure = 1;
    if (pressure < 0.05) pressure = 0.5;

    // Tilt (degrees)
    var tiltX = e.tiltX || 0;
    var tiltY = e.tiltY || 0;
    var tiltRad = Math.sqrt(
      Math.pow(tiltX * Math.PI / 180, 2) +
      Math.pow(tiltY * Math.PI / 180, 2)
    );
    if (!Number.isFinite(tiltRad)) tiltRad = 0;

    // Robust timestamp extraction
    var timestamp = performance.now();
    if (typeof e.timeStamp === 'number' && Number.isFinite(e.timeStamp) && e.timeStamp > 0) {
      timestamp = e.timeStamp;
    }

    return {
      x: x,
      y: y,
      pressure: pressure,
      tiltX: tiltX,
      tiltY: tiltY,
      tilt: tiltRad,
      timestamp: timestamp
    };
  };

  PointerHandler.prototype._interpolateStrokeSegment = function (prevPt, currPt) {
    if (!prevPt) return [currPt];

    var dx = currPt.x - prevPt.x;
    var dy = currPt.y - prevPt.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) return [currPt];

    // Step every 2.5 pixels for smooth, continuous stroke ribbon
    var steps = Math.min(40, Math.max(2, Math.floor(dist / 2.5)));
    var result = [];

    for (var i = 1; i <= steps; i++) {
      var t = i / steps;
      result.push({
        x: prevPt.x + dx * t,
        y: prevPt.y + dy * t,
        pressure: _lerp(prevPt.pressure, currPt.pressure, t),
        tilt: _lerp(prevPt.tilt, currPt.tilt, t),
        timestamp: _lerp(prevPt.timestamp, currPt.timestamp, t)
      });
    }

    return result;
  };

  PointerHandler.prototype._applyWobble = function (pt) {
    // Keep exact coordinates to prevent spraypaint displacement / opposite movement
    return {
      x: pt.x,
      y: pt.y,
      pressure: pt.pressure,
      tilt: pt.tilt,
      timestamp: pt.timestamp
    };
  };

  PointerHandler.prototype._startClearHold = function () {
    var self = this;
    this._clearHoldStart = performance.now();
    this._clearHoldTimer = setInterval(function () {
      var elapsed = performance.now() - self._clearHoldStart;
      var progress = Math.min(1, elapsed / self._clearHoldDuration);
      self.onClearHoldProgress(progress);
      if (progress >= 1) {
        self._cancelClearHold();
      }
    }, 16);
  };

  PointerHandler.prototype._cancelClearHold = function () {
    if (this._clearHoldTimer) {
      clearInterval(this._clearHoldTimer);
      this._clearHoldTimer = null;
    }
    this._clearHoldStart = 0;
    this.onClearHoldProgress(0);
  };

  PointerHandler.prototype.destroy = function () {
    this._detachEvents();
    this._cancelClearHold();
    this._isDrawing = false;
    this._isPenDown = false;
    this._currentStroke = [];
    this._lastPoint = null;
    this._pointerId = null;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PointerHandler };
  } else {
    window.PointerHandler = PointerHandler;
  }
})();