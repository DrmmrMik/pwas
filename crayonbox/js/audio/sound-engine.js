/**
 * sound-engine.js — CrayonBox Audio Engine (Web Audio API)
 * CrayonBox PWA
 *
 * Synthesises all game sounds using Web Audio API:
 *   - Friction: continuous crayon-on-paper sound
 *   - Clack: short click/clack for crayon selection
 *   - Page Turn: swoosh sound for page flipping
 *   - Pop: short pop for undo actions
 *   - Stamp: chime/sparkle pop for sticker stamps
 *   - Sound Mute Toggle state
 */

(function () {
  'use strict';

  function SoundEngine() {
    this.ctx = null;
    this._initialised = false;
    this.isMuted = false;

    // Friction nodes
    this._frictionSource = null;
    this._frictionGain = null;
    this._frictionFilter = null;
    this._frictionRunning = false;
  }

  SoundEngine.prototype.init = function () {
    if (this._initialised && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this._initialised = true;
    } catch (e) {
      console.warn('SoundEngine: Failed to create AudioContext:', e.message);
    }
  };

  SoundEngine.prototype._ensureInit = function () {
    if (this.isMuted) return false;
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return !!this.ctx;
  };

  SoundEngine.prototype.toggleMute = function () {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopFriction();
      this.stopClearTone();
    }
    return this.isMuted;
  };

  // ─── Friction Sound ───

  // ─── Serene Drawing Sound (Soft Rustle + Harmonic Sheen) ───

  SoundEngine.prototype.startFriction = function () {
    if (!this._ensureInit() || this._frictionRunning) return;

    var ctx = this.ctx;
    var sampleRate = ctx.sampleRate;
    var now = ctx.currentTime;

    // 1. Generate 2 seconds of soft Pink/Brown noise (warm paper rustle)
    var bufferSize = sampleRate * 2;
    var noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    var data = noiseBuffer.getChannelData(0);
    var lastOut = 0.0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      data[i] = lastOut * 0.8;
    }

    this._frictionSource = ctx.createBufferSource();
    this._frictionSource.buffer = noiseBuffer;
    this._frictionSource.loop = true;

    this._frictionFilter = ctx.createBiquadFilter();
    this._frictionFilter.type = 'lowpass';
    this._frictionFilter.frequency.value = 240;
    this._frictionFilter.Q.value = 0.5;

    this._frictionGain = ctx.createGain();
    this._frictionGain.gain.setValueAtTime(0, now);

    this._frictionSource.connect(this._frictionFilter);
    this._frictionFilter.connect(this._frictionGain);
    this._frictionGain.connect(ctx.destination);

    // 2. Soft serene harmonic chime tone (soothing pentatonic resonance)
    this._chimeOsc = ctx.createOscillator();
    this._chimeOsc.type = 'sine';
    // Pentatonic soothing notes: A4 (440Hz), C#5 (554.37Hz), E5 (659.25Hz)
    var notes = [440, 554.37, 659.25];
    this._chimeOsc.frequency.setValueAtTime(notes[Math.floor(Math.random() * notes.length)], now);

    this._chimeFilter = ctx.createBiquadFilter();
    this._chimeFilter.type = 'lowpass';
    this._chimeFilter.frequency.value = 800;

    this._chimeGain = ctx.createGain();
    this._chimeGain.gain.setValueAtTime(0, now);

    this._chimeOsc.connect(this._chimeFilter);
    this._chimeFilter.connect(this._chimeGain);
    this._chimeGain.connect(ctx.destination);

    this._frictionSource.start(now);
    this._chimeOsc.start(now);
    this._frictionRunning = true;
  };

  SoundEngine.prototype.updateFriction = function (pressure, velocity) {
    if (this.isMuted || !this._frictionRunning || !this._frictionGain || !this.ctx) return;

    pressure = Math.max(0.1, Math.min(1, pressure || 0.5));
    velocity = Math.max(0, velocity || 0);

    // Soft, serene, delicate volume levels (max gain 0.045 for noise, 0.015 for harmonic tone)
    var targetNoiseGain = Math.min(0.045, (pressure * 0.02) + Math.min(0.025, velocity * 0.00005));
    var targetChimeGain = Math.min(0.018, (pressure * 0.01) + Math.min(0.008, velocity * 0.00002));

    this._frictionGain.gain.setTargetAtTime(targetNoiseGain, this.ctx.currentTime, 0.05);
    if (this._chimeGain) {
      this._chimeGain.gain.setTargetAtTime(targetChimeGain, this.ctx.currentTime, 0.08);
    }

    var freq = 200 + Math.min(120, velocity * 0.05);
    this._frictionFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
  };

  SoundEngine.prototype.stopFriction = function () {
    if (!this._frictionRunning) return;

    var ctx = this.ctx;
    if (ctx) {
      var now = ctx.currentTime;
      if (this._frictionGain) {
        try { this._frictionGain.gain.setTargetAtTime(0, now, 0.03); } catch (e) {}
      }
      if (this._chimeGain) {
        try { this._chimeGain.gain.setTargetAtTime(0, now, 0.04); } catch (e) {}
      }
      if (this._frictionSource) {
        try { this._frictionSource.stop(now + 0.08); } catch (e) {}
      }
      if (this._chimeOsc) {
        try { this._chimeOsc.stop(now + 0.08); } catch (e) {}
      }
    }

    this._frictionSource = null;
    this._frictionFilter = null;
    this._frictionGain = null;
    this._chimeOsc = null;
    this._chimeFilter = null;
    this._chimeGain = null;
    this._frictionRunning = false;
  };

  // ─── Clear Hold Tone ───

  SoundEngine.prototype.startClearTone = function () {
    if (!this._ensureInit()) return;
    this.stopClearTone();

    var ctx = this.ctx;
    var now = ctx.currentTime;

    this._clearOsc = ctx.createOscillator();
    this._clearGain = ctx.createGain();

    this._clearOsc.type = 'triangle';
    this._clearOsc.frequency.setValueAtTime(220, now);
    this._clearOsc.frequency.linearRampToValueAtTime(440, now + 1.5);

    this._clearGain.gain.setValueAtTime(0, now);
    this._clearGain.gain.linearRampToValueAtTime(0.3, now + 0.1);

    this._clearOsc.connect(this._clearGain);
    this._clearGain.connect(ctx.destination);

    this._clearOsc.start(now);
  };

  SoundEngine.prototype.updateClearTone = function (progress) {
    if (this.isMuted || !this.ctx || !this._clearOsc) return;
    var freq = 220 + (440 - 220) * Math.max(0, Math.min(1, progress || 0));
    try {
      this._clearOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.03);
    } catch (e) {}
  };

  SoundEngine.prototype.stopClearTone = function () {
    if (!this.ctx) return;
    var ctx = this.ctx;
    if (this._clearGain) {
      try { this._clearGain.gain.setTargetAtTime(0, ctx.currentTime, 0.03); } catch (e) {}
    }
    if (this._clearOsc) {
      try { this._clearOsc.stop(ctx.currentTime + 0.05); } catch (e) {}
    }
    this._clearOsc = null;
    this._clearGain = null;
  };

  SoundEngine.prototype.playClear = function () {
    if (!this._ensureInit()) return;

    var ctx = this.ctx;
    var now = ctx.currentTime;
    var duration = 0.25;

    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  };

  // ─── Crayon Clack Sound ───

  SoundEngine.prototype.playClack = function () {
    if (!this._ensureInit()) return;

    var ctx = this.ctx;
    var now = ctx.currentTime;
    var duration = 0.06;

    var sampleRate = ctx.sampleRate;
    var bufferSize = Math.ceil(sampleRate * duration);
    var noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 2.0;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration);
  };

  // ─── Page Turn Sound ───

  SoundEngine.prototype.playPageTurn = function () {
    if (!this._ensureInit()) return;

    var ctx = this.ctx;
    var now = ctx.currentTime;
    var duration = 0.3;

    var sampleRate = ctx.sampleRate;
    var bufferSize = Math.ceil(sampleRate * duration);
    var noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    var source = ctx.createBufferSource();
    source.buffer = noiseBuffer;

    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);
    filter.Q.value = 0.8;

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration);
  };

  // ─── Pop Sound (Undo) ───

  SoundEngine.prototype.playPop = function () {
    if (!this._ensureInit()) return;

    var ctx = this.ctx;
    var now = ctx.currentTime;
    var duration = 0.1;

    var osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + duration);

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  };

  // ─── Sticker Stamp Sound ───

  SoundEngine.prototype.playStamp = function () {
    if (!this._ensureInit()) return;

    var ctx = this.ctx;
    var now = ctx.currentTime;
    var duration = 0.18;

    var osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + duration); // C6

    var gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  };

  SoundEngine.prototype.destroy = function () {
    this.stopFriction();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._initialised = false;
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SoundEngine };
  } else {
    window.SoundEngine = SoundEngine;
  }
})();