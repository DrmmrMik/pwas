/**
 * pointer-handler.js — Apple Pencil & Touch Input Handler
 * CrayonBox PWA
 *
 * Manages pointer events (pen + touch) for the crayon coloring app:
 *   - Apple Pencil (pointerType === 'pen') → drawing
 *   - Touch (pointerType === 'touch') → UI interaction, palm rejection
 *   - Coalesced events for 120Hz sampling on iPad Pro
 *   - Catmull-Rom spline interpolation for smooth strokes
 *   - Perlin noise wobble on stroke edges (irregular crayon texture)
 *   - Palm rejection via contact area filtering
 *   - Tilt mapping for stroke width modulation
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
  function _lerp(a, b, t) { return a + t * (b - a); }
  function _grad2D(hash, x, y) {
    var h = hash & 3;
    var u = h < 2 ? x : y;
    var v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  function _perlin2D(x, y) {
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
    return {
      x: _catmullRom(p0.x, p1.x, p2.x, p3.x, t),
      y: _catmullRom(p0.y, p1.y, p2.y, p3.y, t)
    };
  }

  // ─── PointerHandler ───

  /**
   * PointerHandler
   *
   * Manages Apple Pencil and touch input for the CrayonBox canvas.
   *
   * @param {Object} options
   * @param {HTMLCanvasElement} options.canvas      — The drawing canvas element
   * @param {Function} options.onStrokePoint  — Called with {x, y, pressure, tilt, timestamp} for each
   *                                             interpolated stroke point
   * @param {Function} options.onStrokeStart  — Called when a stroke begins
   * @param {Function} options.onStrokeEnd    — Called when a stroke ends
   * @param {Function} options.onClearHoldProgress — Called with progress [0..1] during long-press on clear
   *
   * Example:
   *   var handler = new PointerHandler({
   *     canvas: document.getElementById('drawCanvas'),
   *     onStrokePoint: function(pt) { engine.renderStroke(…) },
   *     onStrokeStart: function() { sound.startFriction() },
   *     onStrokeEnd: function() { sound.stopFriction() }
   *   });
   */
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
    this._dpr = window.devicePixelRatio || 1;
    this._lastTimestamp = 0;
    this._velocity = 0;
    this._lastPoint = null;

    // Clear-hold timer
    this._clearHoldTimer = null;
    this._clearHoldStart = 0;
    this._clearHoldDuration = 1500; // ms

    // Bind event handlers
    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onPointerMove = this.handlePointerMove.bind(this);
    this._onPointerUp = this.handlePointerUp.bind(this);
    this._onPointerCancel = this.handlePointerCancel.bind(this);

    this._attachEvents();
  }

  /**
   * _attachEvents
   * Registers pointer event listeners on the canvas element.
   */
  PointerHandler.prototype._attachEvents = function () {
    var canvas = this.canvas;

    // Use setPointerCapture for reliable tracking
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerCancel);

    // Prevent default touch behaviour (scrolling, zooming)
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    // Ensure the canvas is focusable for keyboard events if needed
    canvas.setAttribute('touch-action', 'none');
    canvas.style.touchAction = 'none';
  };

  /**
   * _detachEvents
   * Removes all event listeners (cleanup).
   */
  PointerHandler.prototype._detachEvents = function () {
    var canvas = this.canvas;
    canvas.removeEventListener('pointerdown', this._onPointerDown);
    canvas.removeEventListener('pointermove', this._onPointerMove);
    canvas.removeEventListener('pointerup', this._onPointerUp);
    canvas.removeEventListener('pointercancel', this._onPointerCancel);
  };

  /**
   * handlePointerDown(e)
   * Handles the pointerdown event.
   * - Pen (pointerType === 'pen'): starts a new stroke
   * - Touch (pointerType === 'touch'): starts clear-hold timer on trash area,
   *   otherwise ignored for drawing (palm rejection)
   */
  PointerHandler.prototype.handlePointerDown = function (e) {
    // Always capture the pointer for reliable tracking
    this.canvas.setPointerCapture(e.pointerId);

    if (e.pointerType === 'pen') {
      // ─── Pen: start drawing ───
      this._isDrawing = true;
      this._isPenDown = true;
      this._pointerId = e.pointerId;
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
        pointerType: e.pointerType,
        timestamp: pt.timestamp
      });

      this.onStrokePoint({
        x: pt.x,
        y: pt.y,
        pressure: pt.pressure,
        tilt: pt.tilt,
        pointerType: e.pointerType,
        timestamp: pt.timestamp,
        strokePoints: this._currentStroke
      });

    } else if (e.pointerType === 'touch') {
      // ─── Touch: palm rejection and UI interaction ───

      // Palm rejection: discard touches with large contact area
      var contactRadius = Math.max(e.width || 0, e.height || 0) / 2;
      if (contactRadius > 20) {
        // Likely a palm — ignore
        return;
      }

      // Single finger on the canvas: ignored for drawing (prevents palm marks
      // when user rests hand on screen). We only handle touch for UI controls
      // (crayon selection, navigation) which are handled by the app, not here.
      // We fire a generic touch event for the app to handle.
      this._isDrawing = false;

      // Emit the point as a "touch" for UI purposes (not drawing)
      this.onStrokePoint({
        x: e.clientX,
        y: e.clientY,
        pressure: 0,
        tilt: 0,
        pointerType: 'touch',
        timestamp: performance.now(),
        isUI: true
      });
    }
  };

  /**
   * handlePointerMove(e)
   * Handles pointermove with coalesced events for 120Hz sampling.
   * Extracts pressure, tilt, and applies Catmull-Rom + Perlin wobble.
   */
  PointerHandler.prototype.handlePointerMove = function (e) {
    if (!this._isPenDown && e.pointerType !== 'pen') return;

    // Get coalesced events for high-rate sampling (iPad Pro 120Hz)
    var coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];

    for (var i = 0; i < coalesced.length; i++) {
      var ev = coalesced[i];
      var pt = this._extractPoint(ev);

      // Compute velocity for friction audio and stroke interpolation
      if (this._lastPoint) {
        var dx = pt.x - this._lastPoint.x;
        var dy = pt.y - this._lastPoint.y;
        var dt = Math.max(0.001, pt.timestamp - this._lastPoint.timestamp);
        var dist = Math.sqrt(dx * dx + dy * dy);
        this._velocity = dist / dt; // pixels per ms
      }

      // Apply Catmull-Rom spline interpolation between the last point and this one
      var interpolated = this._interpolateStrokeSegment(this._lastPoint, pt);

      // Append interpolated points to the stroke array
      for (var j = 0; j < interpolated.length; j++) {
        var ip = interpolated[j];

        // Apply Perlin noise wobble to stroke edges
        var wobbled = this._applyWobble(ip);

        this._currentStroke.push(wobbled);

        this.onStrokePoint({
          x: wobbled.x,
          y: wobbled.y,
          pressure: wobbled.pressure,
          tilt: wobbled.tilt,
          velocity: this._velocity,
          pointerType: 'pen',
          timestamp: wobbled.timestamp,
          strokePoints: this._currentStroke
        });
      }

      this._lastPoint = pt;
    }
  };

  /**
   * handlePointerUp(e)
   * Ends the current stroke.
   */
  PointerHandler.prototype.handlePointerUp = function (e) {
    if (e.pointerType === 'pen' && this._isPenDown) {
      this._isPenDown = false;
      this._isDrawing = false;

      this.onStrokeEnd({
        pointerType: 'pen',
        pointCount: this._currentStroke.length,
        timestamp: performance.now()
      });

      // Release pointer capture
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (ex) {
        // Ignore errors during release
      }

      this._currentStroke = [];
      this._lastPoint = null;
      this._pointerId = null;

      // Cancel any clear-hold timer
      this._cancelClearHold();
    }
  };

  /**
   * handlePointerCancel(e)
   * Cancels the current stroke (e.g., system interrupt).
   */
  PointerHandler.prototype.handlePointerCancel = function (e) {
    if (this._isPenDown) {
      this._isPenDown = false;
      this._isDrawing = false;

      this.onStrokeEnd({
        pointerType: 'pen',
        cancelled: true,
        timestamp: performance.now()
      });

      this._currentStroke = [];
      this._lastPoint = null;
      this._pointerId = null;
      this._cancelClearHold();
    }
  };

  /**
   * _extractPoint(e)
   * Extracts x, y (canvas-relative, scaled by DPR), pressure, tilt, and timestamp
   * from a PointerEvent.
   */
  PointerHandler.prototype._extractPoint = function (e) {
    var rect = this.canvas.getBoundingClientRect();
    // Map CSS-pixel coordinates to canvas internal pixel space.
    // Normalize by the CSS-rendered size, then scale by the canvas buffer dimensions.
    var x = (e.clientX - rect.left) / rect.width * this.canvas.width;
    var y = (e.clientY - rect.top) / rect.height * this.canvas.height;

    // Pressure: Apple Pencil reports [0, 1]; normalise
    var pressure = e.pressure || 0;
    if (pressure > 1) pressure = 1;
    if (pressure < 0) pressure = 0;

    // Tilt: azimuth and altitude from tiltX/tiltY (in degrees)
    var tiltX = e.tiltX || 0;
    var tiltY = e.tiltY || 0;

    // Calculate total tilt angle in radians
    // tiltX/tiltY are in degrees [-90, 90]; convert to radians, compute magnitude
    var tiltRad = Math.sqrt(
      Math.pow(tiltX * Math.PI / 180, 2) +
      Math.pow(tiltY * Math.PI / 180, 2)
    );

    return {
      x: x,
      y: y,
      pressure: pressure,
      tiltX: tiltX,
      tiltY: tiltY,
      tilt: tiltRad,
      timestamp: e.timeStamp || performance.now()
    };
  };

  /**
   * _interpolateStrokeSegment(prevPt, currPt)
   * Generates Catmull-Rom interpolated points between the previous and
   * current pointer sample. Returns an array of points.
   */
  PointerHandler.prototype._interpolateStrokeSegment = function (prevPt, currPt) {
    if (!prevPt) return [currPt];

    // We use a simple interpolation between two points.
    // For a full Catmull-Rom we'd need 4 control points; here we use
    // the last two points from the stroke history.
    var stroke = this._currentStroke;
    var p1 = stroke.length >= 3 ? stroke[stroke.length - 3] : prevPt;
    var p2 = stroke.length >= 2 ? stroke[stroke.length - 2] : prevPt;
    var p3 = stroke.length >= 1 ? stroke[stroke.length - 1] : prevPt;
    var p4 = currPt;

    var segments = 4;
    var result = [];

    for (var i = 1; i <= segments; i++) {
      var t = i / (segments + 1);
      var pt = _catmullRomPoint(p1, p2, p3, p4, t);
      // Interpolate pressure and tilt
      pt.pressure = _lerp(
        p3.pressure !== undefined ? p3.pressure : 0.5,
        p4.pressure !== undefined ? p4.pressure : 0.5,
        t
      );
      pt.tilt = _lerp(
        p3.tilt !== undefined ? p3.tilt : 0,
        p4.tilt !== undefined ? p4.tilt : 0,
        t
      );
      pt.timestamp = _lerp(p3.timestamp || 0, p4.timestamp || 0, t);
      result.push(pt);
    }

    return result;
  };

  /**
   * _applyWobble(pt)
   * Applies Perlin noise displacement to a point to simulate the
   * irregular edge of a real wax crayon.
   *
   * P_wobble = C(t) + n(t) * [A_base * N(f*x, f*y) * (1.0 - 0.4*pressure)]
   * where A_base = 1.5, f = 0.08
   */
  PointerHandler.prototype._applyWobble = function (pt) {
    var A_base = 1.5;
    var f = 0.08;

    var noiseVal = _perlin2D(pt.x * f, pt.y * f);
    var displacement = A_base * noiseVal * (1.0 - 0.4 * (pt.pressure || 0.5));

    // Temporal noise — unique per point based on timestamp
    var temporalNoise = Math.sin(pt.timestamp * 0.01) * 0.5 + 0.5;

    return {
      x: pt.x + displacement * temporalNoise,
      y: pt.y + displacement * temporalNoise,
      pressure: pt.pressure,
      tilt: pt.tilt,
      timestamp: pt.timestamp
    };
  };

  /**
   * _startClearHold()
   * Begins tracking a long-press on the clear button.
   * Calls onClearHoldProgress with progress [0..1].
   */
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
    }, 16); // ~60fps updates
  };

  /**
   * _cancelClearHold()
   * Cancels the clear-hold timer.
   */
  PointerHandler.prototype._cancelClearHold = function () {
    if (this._clearHoldTimer) {
      clearInterval(this._clearHoldTimer);
      this._clearHoldTimer = null;
    }
    this._clearHoldStart = 0;
    this.onClearHoldProgress(0);
  };

  /**
   * _getTiltWidthMultiplier(tilt)
   * Returns a stroke width multiplier based on tilt angle.
   * More tilt = wider stroke (crayon lays on its side).
   *
   * @param {number} tilt — tilt angle in radians
   * @returns {number} multiplier ≥ 1
   */
  PointerHandler.prototype._getTiltWidthMultiplier = function (tilt) {
    // Tilting the pencil lays more crayon on the paper
    // Max width at ~60° tilt
    var tiltDeg = tilt * 180 / Math.PI;
    var factor = 1 + Math.sin(Math.min(tiltDeg, 80) * Math.PI / 180) * 0.6;
    return Math.max(1, Math.min(1.6, factor));
  };

  /**
   * destroy()
   * Cleans up event listeners and internal state.
   */
  PointerHandler.prototype.destroy = function () {
    this._detachEvents();
    this._cancelClearHold();
    this._isDrawing = false;
    this._isPenDown = false;
    this._currentStroke = [];
    this._lastPoint = null;
    this._pointerId = null;
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PointerHandler };
  } else {
    window.PointerHandler = PointerHandler;
  }
})();