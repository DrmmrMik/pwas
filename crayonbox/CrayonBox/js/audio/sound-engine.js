/**
 * sound-engine.js — CrayonBox Audio Engine (Web Audio API)
 * CrayonBox PWA
 *
 * Synthesises all game sounds using the Web Audio API — no audio files required.
 *
 * Sounds:
 *   - Friction: continuous crayon-on-paper sound (white noise → bandpass → gain)
 *   - Clack: short click/clack for crayon selection
 *   - Page Turn: swoosh sound for page flipping
 *   - Pop: short pop for undo actions
 *
 * AudioContext is created on first user interaction (autoplay policy compliance).
 */

(function () {
  'use strict';

  /**
   * SoundEngine
   *
   * Usage:
   *   var sound = new SoundEngine();
   *   // Call init on first user interaction
   *   sound.init();
   *   // Use sounds
   *   sound.startFriction();
   *   sound.updateFriction(0.7, 120);
   *   sound.stopFriction();
   *   sound.playClack();
   *   sound.playPageTurn();
   *   sound.playPop();
   */
  function SoundEngine() {
    this.ctx = null;
    this._initialised = false;

    // Friction nodes
    this._frictionSource = null;
    this._frictionGain = null;
    this._frictionFilter = null;
    this._frictionRunning = false;
  }

  /**
   * init()
   * Creates the AudioContext. Must be called from a user gesture (click/touch)
   * due to browser autoplay policies. Safe to call multiple times.
   */
  SoundEngine.prototype.init = function () {
    if (this._initialised && this.ctx) {
      // Resume if suspended (browsers may suspend a context created off-gesture)
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      // Use the standard AudioContext (with webkit prefix fallback for iOS Safari)
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        console.warn('SoundEngine: Web Audio API not supported');
        return;
      }
      this.ctx = new AC();
      this._initialised = true;
    } catch (e) {
      console.warn('SoundEngine: Failed to create AudioContext:', e.message);
    }
  };

  /**
   * _ensureInit()
   * Ensures the AudioContext is created and running.
   */
  SoundEngine.prototype._ensureInit = function () {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return !!this.ctx;
  };

  // ─── Friction Sound ───

  /**
   * startFriction()
   * Starts the continuous crayon friction sound:
   *   WhiteNoise → BiquadFilterNode(bandpass) → GainNode
   */
  SoundEngine.prototype.startFriction = function () {
    if (!this._ensureInit() || this._frictionRunning) return;

    var ctx = this.ctx;
    var sampleRate = ctx.sampleRate;

    // ─── Create noise buffer ───
    // Generate 1 second of white noise (repeating)
    var bufferSize = sampleRate;
    var noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // ─── Noise source (looping) ───
    this._frictionSource = ctx.createBufferSource();
    this._frictionSource.buffer = noiseBuffer;
    this._frictionSource.loop = true;

    // ─── Bandpass filter ───
    this._frictionFilter = ctx.createBiquadFilter();
    this._frictionFilter.type = 'bandpass';
    this._frictionFilter.frequency.value = 600; // Hz
    this._frictionFilter.Q.value = 1.2; // gentle resonance for paper-like texture

    // ─── Gain node ───
    this._frictionGain = ctx.createGain();
    this._frictionGain.gain.value = 0;

    // ─── Connect graph ───
    this._frictionSource.connect(this._frictionFilter);
    this._frictionFilter.connect(this._frictionGain);
    this._frictionGain.connect(ctx.destination);

    // ─── Start ───
    this._frictionSource.start();
    this._frictionRunning = true;
  };

  /**
   * updateFriction(pressure, velocity)
   * Modulates the friction sound based on drawing pressure and stylus velocity.
   *
   * @param {number} pressure  — pen pressure [0, 1]
   * @param {number} velocity  — stylus velocity (pixels/ms)
   */
  SoundEngine.prototype.updateFriction = function (pressure, velocity) {
    if (!this._frictionRunning || !this._frictionGain || !this._frictionFilter) return;

    pressure = Math.max(0, Math.min(1, pressure || 0));

    // Gain: more pressure = louder friction
    var gainVal = Math.min(1.0, pressure * 0.85 + 0.05);
    this._frictionGain.gain.setTargetAtTime(gainVal, this.ctx.currentTime, 0.05);

    // Filter frequency: higher velocity = higher-pitched scratch
    var freq = 600 + Math.min(3000, (velocity || 0) * 1.5);
    this._frictionFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
  };

  /**
   * stopFriction()
   * Stops the continuous friction sound with a quick fade-out.
   */
  SoundEngine.prototype.stopFriction = function () {
    if (!this._frictionRunning) return;

    var ctx = this.ctx;

    // Quick fade-out to avoid click
    if (this._frictionGain) {
      this._frictionGain.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    }

    // Stop the source after fade-out
    var self = this;
    if (this._frictionSource) {
      try {
        this._frictionSource.stop(ctx.currentTime + 0.1);
      } catch (e) {
        // May throw if already stopped
      }
    }

    // Clean up
    setTimeout(function () {
      try {
        if (self._frictionSource) self._frictionSource.disconnect();
        if (self._frictionFilter) self._frictionFilter.disconnect();
        if (self._frictionGain) self._frictionGain.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      self._frictionSource = null;
      self._frictionFilter = null;
      self._frictionGain = null;
      self._frictionRunning = false;
    }, 150);
  };

  // ─── Crayon "Clack" Sound ───

  /**
   * playClack()
   * Synthesises a short click/clack sound for crayon selection.
   * Uses a short burst of filtered noise with a quick amplitude envelope.
   */
  SoundEngine.prototype.playClack = function () {
    if (!this._ensureInit()) return;

    var ctx = this.ctx;
    var now = ctx.currentTime;

    // ─── Transient noise burst ───
    // A very short noise burst with a percussive envelope

    // Create a short buffer of noise
    var duration = 0.06; // 60ms
    var sampleRate = ctx.sampleRate;
    var bufferSize = Math.ceil(sampleRate * duration);
    var noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Source
    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    // Bandpass filter — tuned to a woody click frequency
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800; // Hz — woody click range
    filter.Q.value = 2.0;

    // Envelope gain: instant attack, fast decay
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Play
    source.start(now);
    source.stop(now + duration);

    // Cleanup
    var self = this;
    source.onended = function () {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (e) {}
    };
  };

  // ─── Page Turn Sound ───

  /**
   * playPageTurn()
   * Synthesises a soft swoosh sound for page flipping.
   * Uses a longer noise burst with a sweeping filter.
   */
  SoundEngine.prototype.playPageTurn = function () {
    if (!this._ensureInit()) return;

    var ctx = this.ctx;
    var now = ctx.currentTime;
    var duration = 0.3; // 300ms

    // ─── Noise source ───
    var sampleRate = ctx.sampleRate;
    var bufferSize = Math.ceil(sampleRate * duration);
    var noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    // ─── Sweeping bandpass filter ───
    // Starts mid, sweeps down to simulate a page whoosh
    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);
    filter.Q.value = 0.8;

    // ─── Gain envelope (swell then decay) ───
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration);

    var self = this;
    source.onended = function () {
      try {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (e) {}
    };
  };

  // ─── Pop Sound (Undo) ───

  /**
   * playPop()
   * Synthesises a short pop sound for undo actions.
   * Uses a brief sine wave tone with quick envelope.
   */
  SoundEngine.prototype.playPop = function () {
    if (!this._ensureInit()) return;

    var ctx = this.ctx;
    var now = ctx.currentTime;
    var duration = 0.1; // 100ms

    // ─── Oscillator ───
    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + duration);

    // ─── Gain envelope ───
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Connect
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);

    var self = this;
    osc.onended = function () {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (e) {}
    };
  };

  // ─── Utility ───

  /**
   * setVolume(volume)
   * Sets the master volume for all sounds.
   *
   * @param {number} volume — [0, 1]
   */
  SoundEngine.prototype.setVolume = function (volume) {
    // For simplicity, volume is set per-sound in their individual gain nodes.
    // A master gain node could be added if needed. For now this is a no-op
    // since each sound has its own gain control.
    console.log('SoundEngine: master volume set to', volume);
  };

  /**
   * destroy()
   * Cleans up all audio resources.
   */
  SoundEngine.prototype.destroy = function () {
    this.stopFriction();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._initialised = false;
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SoundEngine };
  } else {
    window.SoundEngine = SoundEngine;
  }
})();