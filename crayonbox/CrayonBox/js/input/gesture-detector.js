/**
 * GestureDetector — lightweight touch-gesture recognition for CrayonBox.
 *
 * Detects swipe (left/right), single tap, and two-finger tap.
 * Uses raw TouchEvents so it can coexist with the PointerHandler
 * (which uses PointerEvents for Apple Pencil / mouse).
 *
 * @global class GestureDetector
 */
;(function () {
  'use strict';

  var SWIPE_THRESHOLD = 80;   // px of horizontal travel to fire a swipe
  var TAP_DISTANCE    = 20;   // max px from start to qualify as a tap
  var TAP_TIMEOUT     = 300;  // ms max touch duration for a tap
  var TWO_FINGER_GAP  = 300;  // ms window after first finger-up for two-finger tap

  // ── GestureDetector ───────────────────────────────────────────────

  function GestureDetector(opts) {
    opts = opts || {};

    this.element          = opts.element || document;
    this.onSwipeLeft      = opts.onSwipeLeft   || null;
    this.onSwipeRight     = opts.onSwipeRight  || null;
    this.onTap            = opts.onTap         || null;
    this.onTwoFingerTap   = opts.onTwoFingerTap || null;

    // Touch tracking state
    this._touchStartX    = 0;
    this._touchStartY    = 0;
    this._touchStartTime = 0;
    this._touchCount     = 0;
    this._touching       = false;

    // Two-finger tap state
    this._fingerUpTimer  = null;
    this._firstFingerUpTime = 0;

    this._boundStart = this._handleTouchStart.bind(this);
    this._boundEnd   = this._handleTouchEnd.bind(this);
    this._boundMove  = this._handleTouchMove.bind(this);

    this._bindEvents();
  }

  // ── public API ────────────────────────────────────────────────────

  GestureDetector.prototype.destroy = function () {
    this._unbindEvents();
    if (this._fingerUpTimer) {
      clearTimeout(this._fingerUpTimer);
      this._fingerUpTimer = null;
    }
  };

  // ── event binding ─────────────────────────────────────────────────

  GestureDetector.prototype._bindEvents = function () {
    this.element.addEventListener('touchstart', this._boundStart, { passive: true });
    this.element.addEventListener('touchmove',  this._boundMove,  { passive: true });
    this.element.addEventListener('touchend',   this._boundEnd,   { passive: true });
  };

  GestureDetector.prototype._unbindEvents = function () {
    this.element.removeEventListener('touchstart', this._boundStart);
    this.element.removeEventListener('touchmove',  this._boundMove);
    this.element.removeEventListener('touchend',   this._boundEnd);
  };

  // ── handlers ──────────────────────────────────────────────────────

  GestureDetector.prototype._handleTouchStart = function (e) {
    this._touchCount = e.touches.length;

    // Only track single-finger gestures for swipe / tap
    if (e.touches.length === 1) {
      var t = e.touches[0];
      this._touchStartX    = t.clientX;
      this._touchStartY    = t.clientY;
      this._touchStartTime = Date.now();
      this._touching       = true;
    }

    // Clear any pending two-finger tap timer from a prior touch
    if (this._fingerUpTimer) {
      clearTimeout(this._fingerUpTimer);
      this._fingerUpTimer = null;
    }
  };

  GestureDetector.prototype._handleTouchMove = function (e) {
    // We don't need to do anything special on move for our gestures
    // but we could cancel a pending tap if the finger travels too far
    if (this._touching && e.touches.length === 1) {
      var t = e.touches[0];
      var dx = t.clientX - this._touchStartX;
      var dy = t.clientY - this._touchStartY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > TAP_DISTANCE) {
        // Finger has moved beyond tap range — this isn't a tap anymore
        // (but might still be a swipe on touchend)
      }
    }
  };

  GestureDetector.prototype._handleTouchEnd = function (e) {
    // ── Two-finger tap ──────────────────────────────────────────────
    if (this._touchCount >= 2 && e.touches.length === 0) {
      // Both fingers were down, now both up — check timing
      if (this.onTwoFingerTap) {
        this.onTwoFingerTap(e);
      }
      this._reset();
      return;
    }

    // Partial: one finger lifted while another is still down
    if (this._touchCount === 2 && e.touches.length === 1) {
      // First finger up — arm a short timer; if the second goes up
      // within TWO_FINGER_GAP, it's a two-finger tap (handled above).
      var now = Date.now();
      this._firstFingerUpTime = now;
      this._fingerUpTimer = setTimeout(function () {
        // Timer expired — treat remaining finger as a single-finger gesture
        this._fingerUpTimer = null;
      }.bind(this), TWO_FINGER_GAP);
      this._touchCount = 1;
      // Re-base touch start to the remaining finger
      if (e.touches.length === 1) {
        var t = e.touches[0];
        this._touchStartX    = t.clientX;
        this._touchStartY    = t.clientY;
        this._touchStartTime = Date.now();
      }
      return;
    }

    // ── Single-finger gestures ─────────────────────────────────────
    if (this._touching && e.changedTouches.length === 1) {
      var ct   = e.changedTouches[0];
      var dx   = ct.clientX - this._touchStartX;
      var dy   = ct.clientY - this._touchStartY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var dt   = Date.now() - this._touchStartTime;

      if (dist > SWIPE_THRESHOLD) {
        // ── Swipe ──────────────────────────────────────────────────
        if (dx > 0 && this.onSwipeRight) {
          this.onSwipeRight(e);
        } else if (dx < 0 && this.onSwipeLeft) {
          this.onSwipeLeft(e);
        }
      } else if (dist < TAP_DISTANCE && dt < TAP_TIMEOUT) {
        // ── Tap ────────────────────────────────────────────────────
        if (this.onTap) {
          this.onTap(e);
        }
      }
    }

    this._reset();
  };

  // ── internal ──────────────────────────────────────────────────────

  GestureDetector.prototype._reset = function () {
    this._touchStartX    = 0;
    this._touchStartY    = 0;
    this._touchStartTime = 0;
    this._touchCount     = 0;
    this._touching       = false;
  };

  // ── export ────────────────────────────────────────────────────────

  window.GestureDetector = GestureDetector;
})();
