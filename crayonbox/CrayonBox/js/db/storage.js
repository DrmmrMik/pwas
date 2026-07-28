/**
 * Storage — IndexedDB persistence for CrayonBox.
 * Provides auto-save, thumbnail generation, persistent storage request,
 * and storage-quota monitoring.
 *
 * Database: CrayonBoxDB
 *   - pages_meta:  keyPath=page_id, indexes=[last_modified, is_dirty]
 *   - page_strokes: keyPath=page_id
 *
 * @global class Storage
 */
;(function () {
  'use strict';

  // ── helpers ──────────────────────────────────────────────────────

  /** Minimal debounce — trailing edge only. */
  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var ctx = this, args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(ctx, args);
      }, ms);
    };
  }

  // ── Storage class ─────────────────────────────────────────────────

  function Storage() {
    this.db = null;
    this.DB_NAME = 'CrayonBoxDB';
    this.DB_VERSION = 1;

    // Auto-save debounced (300 ms after last call)
    this.autoSave = debounce(function (pageId, rasterBlob, strokeHistory) {
      this.savePageStrokes(pageId, rasterBlob, strokeHistory).catch(function (err) {
        console.warn('[Storage] auto-save failed:', err);
      });
    }, 300).bind(this);
  }

  /**
   * Open (or create / upgrade) the IndexedDB database.
   * Returns a Promise that resolves once the DB is ready.
   */
  Storage.prototype.init = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(self.DB_NAME, self.DB_VERSION);

      request.onupgradeneeded = function (e) {
        var db = e.target.result;

        // ── pages_meta store ──────────────────────────────────────
        if (!db.objectStoreNames.contains('pages_meta')) {
          var metaStore = db.createObjectStore('pages_meta', { keyPath: 'page_id' });
          metaStore.createIndex('last_modified', 'last_modified', { unique: false });
          metaStore.createIndex('is_dirty', 'is_dirty', { unique: false });
        }

        // ── page_strokes store ────────────────────────────────────
        if (!db.objectStoreNames.contains('page_strokes')) {
          db.createObjectStore('page_strokes', { keyPath: 'page_id' });
        }
      };

      request.onsuccess = function (e) {
        self.db = e.target.result;

        // Request persistent storage so the browser won't evict our data
        self._requestPersistence();

        // Monitor storage quota
        self._monitorStorage();

        resolve();
      };

      request.onerror = function (e) {
        reject(e.target.error || new Error('Failed to open IndexedDB'));
      };
    });
  };

  // ── persistence & monitoring ──────────────────────────────────────

  Storage.prototype._requestPersistence = function () {
    if (!navigator.storage || !navigator.storage.persist) return;
    navigator.storage.persist().then(function (granted) {
      if (granted) {
        console.log('[Storage] Persistent storage granted');
      } else {
        console.warn('[Storage] Persistent storage denied — data may be evicted under storage pressure');
      }
    }).catch(function (err) {
      console.warn('[Storage] persist() call failed:', err);
    });
  };

  Storage.prototype._monitorStorage = function () {
    if (!navigator.storage || !navigator.storage.estimate) return;
    var self = this;
    // Check periodically (every 30 s) and once now
    function check() {
      navigator.storage.estimate().then(function (estimate) {
        var usage = estimate.usage || 0;
        var quota = estimate.quota || 1;
        var pct = (usage / quota) * 100;
        if (pct > 80) {
          console.warn('[Storage] Storage usage at ' + pct.toFixed(1) + '% — consider clearing old pages');
        }
      }).catch(function () { /* silent */ });
    }
    check();
    setInterval(check, 30000);
  };

  // ── page meta CRUD ────────────────────────────────────────────────

  Storage.prototype.savePageMeta = function (pageId, title, thumbnailBlob, lastModified, isDirty) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx = self.db.transaction('pages_meta', 'readwrite');
      var store = tx.objectStore('pages_meta');
      var record = {
        page_id: pageId,
        title: title || '',
        thumbnail: thumbnailBlob || null,
        last_modified: lastModified || Date.now(),
        is_dirty: isDirty !== undefined ? !!isDirty : true
      };
      var req = store.put(record);
      req.onsuccess = function () { resolve(); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  };

  Storage.prototype.getPageMeta = function (pageId) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx = self.db.transaction('pages_meta', 'readonly');
      var store = tx.objectStore('pages_meta');
      var req = store.get(pageId);
      req.onsuccess = function (e) { resolve(e.target.result || null); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  };

  Storage.prototype.getAllPageMeta = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx = self.db.transaction('pages_meta', 'readonly');
      var store = tx.objectStore('pages_meta');
      var req = store.getAll();
      req.onsuccess = function (e) { resolve(e.target.result || []); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  };

  // ── page strokes CRUD ────────────────────────────────────────────

  Storage.prototype.savePageStrokes = function (pageId, rasterBlob, strokeHistory) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx = self.db.transaction('page_strokes', 'readwrite');
      var store = tx.objectStore('page_strokes');
      var record = {
        page_id: pageId,
        raster_blob: rasterBlob || null,
        stroke_history: strokeHistory || []
      };
      var req = store.put(record);
      req.onsuccess = function () { resolve(); };
      req.onerror = function (e) { reject(e.target.error); };
    });
  };

  Storage.prototype.getPageStrokes = function (pageId) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx = self.db.transaction('page_strokes', 'readonly');
      var store = tx.objectStore('page_strokes');
      var req = store.get(pageId);
      req.onsuccess = function (e) {
        var result = e.target.result;
        if (result) {
          resolve({ raster_blob: result.raster_blob, stroke_history: result.stroke_history });
        } else {
          resolve({ raster_blob: null, stroke_history: [] });
        }
      };
      req.onerror = function (e) { reject(e.target.error); };
    });
  };

  // ── delete ────────────────────────────────────────────────────────

  Storage.prototype.deletePage = function (pageId) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var tx = self.db.transaction(['pages_meta', 'page_strokes'], 'readwrite');
      tx.objectStore('pages_meta').delete(pageId);
      tx.objectStore('page_strokes').delete(pageId);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function (e) { reject(e.target.error); };
    });
  };

  // ── thumbnail generation ─────────────────────────────────────────

  /**
   * Generate a 683×512 PNG thumbnail from a canvas and return it as a Blob.
   * @param {HTMLCanvasElement} canvas  Source canvas (e.g. the main drawing canvas)
   * @param {string}            pageId  Used for console logging only
   * @returns {Promise<Blob>}
   */
  Storage.prototype.generateThumbnail = function (canvas, pageId) {
    var THUMB_W = 683;
    var THUMB_H = 512;

    return new Promise(function (resolve, reject) {
      // Create an offscreen canvas at the target dimensions
      var offscreen = document.createElement('canvas');
      offscreen.width = THUMB_W;
      offscreen.height = THUMB_H;
      var ctx = offscreen.getContext('2d');

      // Draw source canvas scaled into the thumbnail
      ctx.drawImage(canvas, 0, 0, THUMB_W, THUMB_H);

      // Convert to blob
      offscreen.toBlob(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail for ' + pageId));
        }
      }, 'image/png');
    });
  };

  // ── export ────────────────────────────────────────────────────────

  window.Storage = Storage;
})();
