/**
 * App — main application orchestrator for CrayonBox.
 *
 * State machine: BOOK_CAROUSEL ⇄ WORKSPACE ⇄ GALLERY
 *
 * Dependencies (loaded globally via script tags):
 *   PaperTexture, Shaders, WebGLEngine (js/render/)
 *   PointerHandler  (js/input/pointer-handler.js)
 *   GestureDetector (js/input/gesture-detector.js)
 *   SoundEngine     (js/audio/sound-engine.js)
 *   Storage         (js/db/storage.js)
 *
 * @global class App  (window.CrayonBoxApp = new App())
 */
;(function () {
  'use strict';

  var PAGE_COUNT = 8;
  var PAGE_PREFIX = 'assets/pages/';
  var PAGE_EXT = '.svg';

  var CANVAS_W = 2732;
  var CANVAS_H = 2048;

  var CRAYON_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#14B8A6', // Teal
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#A0522D', // Brown
    '#1C1917', // Black
    '#6B7280', // Gray
    '#FFFFFF'  // White (eraser)
  ];

  // ── App constructor ───────────────────────────────────────────────

  function App() {
    this.state = 'INIT';
    this.currentPage = 1;
    this.loadingEl      = document.getElementById('loading');
    this.bookScreen     = document.getElementById('screen-book-carousel');
    this.workspaceScreen = document.getElementById('screen-workspace');
    this.galleryScreen  = document.getElementById('screen-gallery');
    this.pageLeft       = document.getElementById('pageLeft');
    this.pageRight      = document.getElementById('pageRight');
    this.spineEl        = document.querySelector('.book-spine');
    this.pageIndicator  = document.getElementById('pageIndicator');
    this.prevBtn        = document.getElementById('prevPageBtn');
    this.nextBtn        = document.getElementById('nextPageBtn');
    this.canvas         = document.getElementById('crayon-canvas');
    this.coloringSvg    = document.getElementById('coloringSvg');
    this.canvasContainer = document.querySelector('.canvas-container');
    this.backBtn        = document.getElementById('backBtn');
    this.undoBtn        = document.getElementById('undoBtn');
    this.clearBtn       = document.getElementById('clearBtn');
    this.clearProgress  = document.getElementById('clearProgress');
    this.paletteEl      = document.getElementById('crayonPalette');
    this.colorSwatch    = document.getElementById('colorSwatch');
    this.bookSpread     = document.getElementById('bookSpread');
    this.bookContainer  = document.getElementById('bookContainer');
    this.galleryBtn     = document.getElementById('galleryBtn');
    this.galleryBackBtn = document.getElementById('galleryBackBtn');
    this.galleryGrid    = document.getElementById('galleryGrid');
    this.rotateOverlay  = document.getElementById('rotateOverlay');
    this.engine         = null;
    this.pointerHandler = null;
    this.storage        = null;
    this.soundEngine    = null;
    this.gestureDetector = null;
    this._clearHoldTimer  = null;
    this._clearHoldActive = false;
    this._selectedColor   = CRAYON_COLORS[0];
    this._svgCache = {};
    this._onResize = this._handleResize.bind(this);
    this._onOrientationChange = this._handleOrientation.bind(this);
    // Kick off initialization
    var self = this;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { self.init(); });
    } else {
      self.init();
    }
  }

  // ── INIT ──────────────────────────────────────────────────────────

  App.prototype.init = function () {
    var self = this;

    // 1. Create Storage
    this.storage = new Storage();

    // 2. Init IndexedDB
    this.storage.init().then(function () {
      console.log('[App] IndexedDB ready');

      // 3. Create SoundEngine
      self.soundEngine = new SoundEngine();

      // 4. Create GestureDetector for the book screen
      self.gestureDetector = new GestureDetector({
        element: self.bookScreen,
        onSwipeLeft: function () { self._goToNextPage(); },
        onSwipeRight: function () { self._goToPrevPage(); },
        onTap: function (e) { self._handleBookTap(e); }
      });

      // 5. Bind UI events
      self._bindEvents();

      // 6. Initialise book carousel state
      self._enterBookCarousel();

      // 7. Hide loading screen
      self._hideLoading();

      // 8. Handle resize
      window.addEventListener('resize', self._onResize);
      window.addEventListener('orientationchange', self._onOrientationChange);

    }).catch(function (err) {
      console.error('[App] Failed to init IndexedDB:', err);
      // Still show the app even without DB (no persistence)
      self._enterBookCarousel();
      self._hideLoading();
    });
  };

  App.prototype._hideLoading = function () {
    if (this.loadingEl) {
      this.loadingEl.classList.add('hidden');
    }
  };

  // ── STATE MACHINE ─────────────────────────────────────────────────

  App.prototype._setState = function (newState) {
    console.log('[App] State:', this.state, '→', newState);
    this.state = newState;
  };

  // ── Orientation ──────────────────────────────────────────────────

  App.prototype._handleOrientation = function () {
    if (this.state === 'WORKSPACE' && window.innerHeight > window.innerWidth) {
      // Portrait mode in workspace — show rotate overlay
      if (this.rotateOverlay) {
        this.rotateOverlay.classList.add('active');
      }
    } else {
      if (this.rotateOverlay) {
        this.rotateOverlay.classList.remove('active');
      }
    }
  };

  // ── BOOK CAROUSEL ─────────────────────────────────────────────────

  App.prototype._enterBookCarousel = function () {
    var self = this;

    this._setState('BOOK_CAROUSEL');

    // Show book screen, hide workspace and gallery
    this.bookScreen.classList.add('active');
    this.workspaceScreen.classList.remove('active');
    if (this.galleryScreen) this.galleryScreen.classList.remove('active');

    // Hide rotate overlay
    if (this.rotateOverlay) this.rotateOverlay.classList.remove('active');

    // Destroy workspace engine if it exists
    this._destroyWorkspace();

    // Re-create gesture detector for the book screen if it was destroyed
    // by a previous trip to the workspace
    if (!this.gestureDetector) {
      this.gestureDetector = new GestureDetector({
        element: self.bookScreen,
        onSwipeLeft: function () { self._goToNextPage(); },
        onSwipeRight: function () { self._goToPrevPage(); },
        onTap: function (e) { self._handleBookTap(e); }
      });
    }

    // Render the current spread
    this._renderSpread();

    // Update page indicator
    this._updatePageIndicator();

    // Load thumbnails from IndexedDB for previously colored pages
    this._loadThumbnails();
  };

  App.prototype._renderSpread = function () {
    var self = this;
    var page = this.currentPage;
    var leftIdx  = page === 1 ? PAGE_COUNT : page - 1;
    var rightIdx = page;

    // Check for stored thumbnails first — show them instead of raw SVG
    this._applyThumbnailToPage(leftIdx, this.pageLeft);
    this._applyThumbnailToPage(rightIdx, this.pageRight);

    // Always load SVG content (hidden behind thumbnail if present)
    this._loadSvgInto(leftIdx, this.pageLeft);
    this._loadSvgInto(rightIdx, this.pageRight);

    // Click fallback for non-touch devices
    this._onPageClick = function (e) { self._handleBookTap(e); };
    this.pageRight.addEventListener('click', this._onPageClick);
  };

  App.prototype._applyThumbnailToPage = function (pageNum, container) {
    var self = this;
    var key = 'page_' + String(pageNum).padStart(3, '0');

    this.storage.getPageMeta(key).then(function (meta) {
      if (meta && meta.thumbnail) {
        var url = URL.createObjectURL(meta.thumbnail);
        container.style.backgroundImage = 'url(' + url + ')';
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
        // Hide the SVG overlay so the thumbnail shows
        var svg = container.querySelector('svg');
        if (svg) svg.style.opacity = '0';
      }
    }).catch(function (err) {
      console.warn('[App] Failed to load thumbnail for', key, err);
    });
  };

  App.prototype._loadSvgInto = function (pageNum, container) {
    var self = this;
    var key = 'page_' + String(pageNum).padStart(3, '0');

    // Reuse cached SVG
    if (this._svgCache[key]) {
      // Check if container already has this SVG
      var existing = container.querySelector('svg');
      if (existing && existing.innerHTML === '') {
        existing.innerHTML = this._svgCache[key];
      }
      return;
    }

    var url = PAGE_PREFIX + key + PAGE_EXT;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        self._svgCache[key] = xhr.responseText;
        // Put SVG into the container's svg element
        var svg = container.querySelector('svg');
        if (svg) {
          svg.innerHTML = xhr.responseText;
        }
      } else {
        console.warn('[App] Failed to load', url, xhr.status);
      }
    };
    xhr.onerror = function () {
      console.warn('[App] Network error loading', url);
    };
    xhr.send();
  };

  App.prototype._updatePageIndicator = function () {
    if (this.pageIndicator) {
      this.pageIndicator.textContent = 'Page ' + this.currentPage + ' of ' + PAGE_COUNT;
    }
  };

  App.prototype._loadThumbnails = function () {
    var self = this;
    this.storage.getAllPageMeta().then(function (metas) {
      metas.forEach(function (meta) {
        if (meta.thumbnail) {
          // Find the page element by page_id and set the thumbnail as a background image
          var pageNum = parseInt(meta.page_id.replace('page_', ''), 10);
          var url = URL.createObjectURL(meta.thumbnail);
          // Set thumbnail on the correct page element
          var leftPage  = self.pageLeft;
          var rightPage = self.pageRight;
          var leftIdx  = self.currentPage === 1 ? PAGE_COUNT : self.currentPage - 1;
          var rightIdx = self.currentPage;

          var leftKey  = 'page_' + String(leftIdx).padStart(3, '0');
          var rightKey = 'page_' + String(rightIdx).padStart(3, '0');

          if (meta.page_id === leftKey) {
            leftPage.style.backgroundImage = 'url(' + url + ')';
            leftPage.style.backgroundSize = 'cover';
            leftPage.style.backgroundPosition = 'center';
          } else if (meta.page_id === rightKey) {
            rightPage.style.backgroundImage = 'url(' + url + ')';
            rightPage.style.backgroundSize = 'cover';
            rightPage.style.backgroundPosition = 'center';
          }
        }
      });
    }).catch(function (err) {
      console.warn('[App] Failed to load thumbnails:', err);
    });
  };

  App.prototype._goToNextPage = function () {
    this.currentPage = this.currentPage >= PAGE_COUNT ? 1 : this.currentPage + 1;
    this._renderSpread();
    this._updatePageIndicator();
    this._loadThumbnails();

    // Audio: page turn sound
    if (this.soundEngine && typeof this.soundEngine.playPageTurn === 'function') {
      this.soundEngine.playPageTurn();
    }
  };

  App.prototype._goToPrevPage = function () {
    this.currentPage = this.currentPage <= 1 ? PAGE_COUNT : this.currentPage - 1;
    this._renderSpread();
    this._updatePageIndicator();
    this._loadThumbnails();

    // Audio: page turn sound
    if (this.soundEngine && typeof this.soundEngine.playPageTurn === 'function') {
      this.soundEngine.playPageTurn();
    }
  };

  App.prototype._handleBookTap = function (e) {
    // Determine if the tap was on the right page
    var rect = this.bookScreen.getBoundingClientRect();
    var x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    var midX = rect.left + rect.width / 2;

    if (x >= midX) {
      // Tapped on the right page — transition to workspace
      this._enterWorkspace();
    }
  };

  // ── WORKSPACE ─────────────────────────────────────────────────────

  App.prototype._enterWorkspace = function () {
    var self = this;

    // Remove page click listener (added in book carousel)
    if (this._onPageClick) {
      this.pageRight.removeEventListener('click', this._onPageClick);
      this._onPageClick = null;
    }

    this._setState('WORKSPACE');

    // Show workspace screen, hide book
    this.workspaceScreen.classList.add('active');
    this.bookScreen.classList.remove('active');

    // Destroy previous gesture detector on book screen
    if (this.gestureDetector) {
      this.gestureDetector.destroy();
      this.gestureDetector = null;
    }

    // ── Canvas setup ────────────────────────────────────────────────
    this._setupCanvas();

    // ── Init WebGL engine BEFORE loading SVG ────────────────────────
    if (typeof CrayonEngine !== 'undefined') {
      this.engine = new CrayonEngine();
      var initOk = this.engine.init(this.canvas);
      if (initOk) {
        // Clear to paper color immediately so the canvas isn't black
        if (typeof this.engine.clear === 'function') {
          this.engine.clear();
        }
      }
    } else {
      console.warn('[App] CrayonEngine not loaded');
    }

    // ── Load the SVG overlay ───────────────────────────────────────
    var key = 'page_' + String(this.currentPage).padStart(3, '0');
    var svgContent = this._svgCache[key];
    if (svgContent) {
      this.coloringSvg.innerHTML = svgContent;
    } else {
      // SVG not yet cached — load it directly for the overlay
      this._loadSvgInto(this.currentPage, this.coloringSvg);
    }

    // ── Init PointerHandler ────────────────────────────────────────
    if (typeof PointerHandler !== 'undefined') {
      this.pointerHandler = new PointerHandler({
        canvas: this.canvas,
        onStrokeStart: function (data) {
          // Start friction sound
          if (self.soundEngine && typeof self.soundEngine.startFriction === 'function') {
            self.soundEngine.startFriction();
          }
          // Begin a new stroke on the engine
          if (self.engine) {
            self.engine.startStroke(data.x, data.y, self._selectedColor, data.pressure, data.tilt);
          }
        },
        onStrokePoint: function (data) {
          // Feed each interpolated / wobbled point to the engine incrementally
          if (self.engine) {
            self.engine.renderPoint(data.x, data.y, self._selectedColor, data.pressure, data.tilt);
          }
          // Update friction sound with velocity
          if (self.soundEngine && typeof self.soundEngine.updateFriction === 'function') {
            self.soundEngine.updateFriction(data.pressure || 0.5, data.velocity || 0);
          }
        },
        onStrokeEnd: function () {
          // Finalize the stroke (saves to history for undo)
          if (self.engine) {
            self.engine.endStroke();
          }
          // Stop friction sound
          if (self.soundEngine && typeof self.soundEngine.stopFriction === 'function') {
            self.soundEngine.stopFriction();
          }
          self._autoSaveStroke();
        }
      });
    } else {
      console.warn('[App] PointerHandler not loaded');
    }

    // ── Build palette ──────────────────────────────────────────────
    this._buildPalette();

    // Ensure the initial selected color is applied to the engine
    this._selectCrayon(this._selectedColor);

    // ── Load saved strokes from DB ─────────────────────────────────
    this._loadStrokes();

    // ── Bind workspace events ──────────────────────────────────────
    this._bindWorkspaceEvents();

    // ── Init pinch-to-zoom on canvas container ──────────────────
    this._initPinchZoom();

    // ── Check orientation ──────────────────────────────────────────
    this._handleOrientation();
  };

  App.prototype._setupCanvas = function () {
    // Set canvas internal resolution
    this.canvas.width  = CANVAS_W;
    this.canvas.height = CANVAS_H;

    // The canvas will be scaled to viewport by CSS (object-fit: contain)
    this.canvas.style.width  = '100%';
    this.canvas.style.height = '100%';
  };

  App.prototype._buildPalette = function () {
    var self = this;
    this.paletteEl.innerHTML = '';

    CRAYON_COLORS.forEach(function (color, idx) {
      var wrapper = document.createElement('div');
      wrapper.className = 'crayon-wrapper';

      var crayon = document.createElement('div');
      crayon.className = 'crayon';
      if (idx === 0) crayon.classList.add('selected');
      crayon.style.background = color;
      crayon.dataset.color = color;
      crayon.dataset.index = idx;

      // Tip
      var tip = document.createElement('div');
      tip.className = 'crayon-tip';
      tip.style.background = color;
      crayon.appendChild(tip);

      // Label (hidden but accessible)
      var label = document.createElement('span');
      label.className = 'crayon-label';
      label.textContent = color;
      crayon.appendChild(label);

      // Click handler
      crayon.addEventListener('click', function () {
        self._selectCrayon(color);
      });

      wrapper.appendChild(crayon);
      self.paletteEl.appendChild(wrapper);
    });
  };

  App.prototype._selectCrayon = function (color) {
    this._selectedColor = color;

    // Update selected class
    var crayons = this.paletteEl.querySelectorAll('.crayon');
    crayons.forEach(function (c) {
      c.classList.toggle('selected', c.dataset.color === color);
    });

    // If white, set eraser mode
    var isEraser = (color === '#FFFFFF');

    // Notify engine and pointer handler
    if (this.engine && typeof this.engine.setColor === 'function') {
      this.engine.setColor(color);
    }
    if (this.engine && typeof this.engine.setEraser === 'function') {
      this.engine.setEraser(isEraser);
    }
    if (this.pointerHandler && typeof this.pointerHandler.setColor === 'function') {
      this.pointerHandler.setColor(color);
    }

    // Play sound
    if (this.soundEngine && typeof this.soundEngine.playClack === 'function') {
      this.soundEngine.playClack();
    }

    // Update color swatch
    if (this.colorSwatch) {
      this.colorSwatch.style.background = color;
    }
  };

  // ── workspace persistence ─────────────────────────────────────────

  App.prototype._loadStrokes = function () {
    var self = this;
    var pageId = 'page_' + String(this.currentPage).padStart(3, '0');

    this.storage.getPageStrokes(pageId).then(function (data) {
      if (data.raster_blob) {
        // Load the raster image onto the canvas
        var img = new Image();
        img.onload = function () {
          // Use an offscreen canvas for compositing since this canvas
          // already has a WebGL context (getContext('2d') would return null)
          var offCanvas = document.createElement('canvas');
          offCanvas.width = CANVAS_W;
          offCanvas.height = CANVAS_H;
          var offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
          }
          if (self.engine && typeof self.engine.loadImage === 'function') {
            self.engine.loadImage(img);
          }
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(data.raster_blob);
      }
      // stroke_history can be passed to the engine/pointer handler if needed
      if (self.engine && typeof self.engine.loadStrokeHistory === 'function') {
        self.engine.loadStrokeHistory(data.stroke_history || []);
      }
    }).catch(function (err) {
      console.warn('[App] Failed to load strokes:', err);
    });
  };

  App.prototype._autoSaveStroke = function () {
    var self = this;
    var pageId = 'page_' + String(this.currentPage).padStart(3, '0');

    // Get raster data from canvas
    this.canvas.toBlob(function (rasterBlob) {
      if (!rasterBlob) return;

      // Get stroke history from engine
      var strokeHistory = [];
      if (self.engine && typeof self.engine.getStrokeHistory === 'function') {
        strokeHistory = self.engine.getStrokeHistory();
      }

      // Use the debounced auto-save on storage
      self.storage.autoSave(pageId, rasterBlob, strokeHistory);

      // Also save meta with updated thumbnail
      self.storage.generateThumbnail(self.canvas, pageId).then(function (thumbBlob) {
        self.storage.savePageMeta(
          pageId,
          'Page ' + self.currentPage,
          thumbBlob,
          Date.now(),
          true
        ).catch(function (err) {
          console.warn('[App] Failed to save page meta:', err);
        });
      }).catch(function (err) {
        console.warn('[App] Failed to generate thumbnail:', err);
      });
    }, 'image/png');
  };

  // ── workspace actions ─────────────────────────────────────────────

  App.prototype._backToBook = function () {
    var self = this;

    // Save before leaving
    var pageId = 'page_' + String(this.currentPage).padStart(3, '0');
    this.canvas.toBlob(function (rasterBlob) {
      if (!rasterBlob) return;

      var strokeHistory = [];
      if (self.engine && typeof self.engine.getStrokeHistory === 'function') {
        strokeHistory = self.engine.getStrokeHistory();
      }

      self.storage.savePageStrokes(pageId, rasterBlob, strokeHistory).then(function () {
        self.storage.generateThumbnail(self.canvas, pageId).then(function (thumbBlob) {
          self.storage.savePageMeta(
            pageId,
            'Page ' + self.currentPage,
            thumbBlob,
            Date.now(),
            false
          ).then(function () {
            self._enterBookCarousel();
          }).catch(function (err) {
            console.warn('[App] Meta save failed:', err);
            self._enterBookCarousel();
          });
        }).catch(function () {
          self._enterBookCarousel();
        });
      }).catch(function () {
        self._enterBookCarousel();
      });
    }, 'image/png');
  };

  App.prototype._undoLastStroke = function () {
    if (this.engine && typeof this.engine.clearLastStroke === 'function') {
      this.engine.clearLastStroke();
    }

    // Auto-save after undo
    this._autoSaveStroke();

    // Play pop sound
    if (this.soundEngine && typeof this.soundEngine.playPop === 'function') {
      this.soundEngine.playPop();
    }
  };

  App.prototype._clearCanvas = function () {
    var self = this;

    // Clear via WebGL engine if available
    if (this.engine && typeof this.engine.clear === 'function') {
      this.engine.clear();
    }

    // Also clear the 2D canvas fallback via an offscreen canvas
    // (WebGL owns the real canvas, so we can't get a 2D context on it)

    // Reset stroke history
    if (this.engine && typeof this.engine.resetStrokeHistory === 'function') {
      this.engine.resetStrokeHistory();
    }

    // Auto-save after clear
    this._autoSaveStroke();

    // Play sound
    if (this.soundEngine && typeof this.soundEngine.playClear === 'function') {
      this.soundEngine.playClear();
    }
  };

  App.prototype._startClearHold = function () {
    var self = this;

    if (this._clearHoldTimer) return;

    this._clearHoldActive = false;

    // Animate the progress ring
    if (this.clearProgress) {
      this.clearProgress.classList.add('active');
    }

    this._clearHoldTimer = setTimeout(function () {
      self._clearHoldActive = true;
      self._clearCanvas();

      // Clean up
      if (self.clearProgress) {
        self.clearProgress.classList.remove('active');
      }
      self._clearHoldTimer = null;
    }, 1500);
  };

  App.prototype._cancelClearHold = function () {
    if (this._clearHoldTimer) {
      clearTimeout(this._clearHoldTimer);
      this._clearHoldTimer = null;
    }
    if (this.clearProgress) {
      this.clearProgress.classList.remove('active');
    }
    this._clearHoldActive = false;
  };

  // ── Gallery ────────────────────────────────────────────────────────

  App.prototype._openGallery = function () {
    var self = this;

    this._setState('GALLERY');

    this.galleryScreen.classList.add('active');
    this.bookScreen.classList.remove('active');

    // Destroy gesture detector
    if (this.gestureDetector) {
      this.gestureDetector.destroy();
      this.gestureDetector = null;
    }

    // Load gallery items
    this._renderGallery();
  };

  App.prototype._renderGallery = function () {
    var self = this;
    this.galleryGrid.innerHTML = '<div class="gallery-empty">No artwork saved yet — start coloring!</div>';

    this.storage.getAllPageMeta().then(function (metas) {
      // Filter to only metas that have thumbnails
      var withThumbs = metas.filter(function (m) { return m.thumbnail; });

      if (withThumbs.length === 0) return;

      self.galleryGrid.innerHTML = '';

      withThumbs.forEach(function (meta) {
        var item = document.createElement('div');
        item.className = 'gallery-item';

        var img = document.createElement('img');
        img.src = URL.createObjectURL(meta.thumbnail);
        img.alt = meta.title || meta.page_id;
        item.appendChild(img);

        var label = document.createElement('div');
        label.className = 'gallery-item-label';
        label.textContent = meta.title || meta.page_id;
        item.appendChild(label);

        // Click to open that page in workspace
        item.addEventListener('click', function () {
          var pageNum = parseInt(meta.page_id.replace('page_', ''), 10);
          if (pageNum >= 1 && pageNum <= PAGE_COUNT) {
            self.currentPage = pageNum;
            self._enterWorkspace();
          }
        });

        self.galleryGrid.appendChild(item);
      });
    }).catch(function (err) {
      console.warn('[App] Failed to load gallery:', err);
    });
  };

  // ── event binding ─────────────────────────────────────────────────

  App.prototype._bindEvents = function () {
    var self = this;

    // Book carousel navigation
    this.prevBtn.addEventListener('click', function () { self._goToPrevPage(); });
    this.nextBtn.addEventListener('click', function () { self._goToNextPage(); });

    // Book carousel keyboard navigation
    this.bookScreen.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { self._goToPrevPage(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { self._goToNextPage(); e.preventDefault(); }
    });

    // Gallery button
    if (this.galleryBtn) {
      this.galleryBtn.addEventListener('click', function () {
        self._openGallery();
      });
    }

    // Gallery back button
    if (this.galleryBackBtn) {
      this.galleryBackBtn.addEventListener('click', function () {
        self._enterBookCarousel();
      });
    }
  };

  App.prototype._bindWorkspaceEvents = function () {
    var self = this;

    // Back button
    this.backBtn.addEventListener('click', function () {
      self._backToBook();
    });

    // Undo button
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', function () {
        self._undoLastStroke();
      });
    }

    // Clear button — hold for 1.5s
    this.clearBtn.addEventListener('mousedown', function () { self._startClearHold(); });
    this.clearBtn.addEventListener('mouseup', function () { self._cancelClearHold(); });
    this.clearBtn.addEventListener('mouseleave', function () { self._cancelClearHold(); });
    this.clearBtn.addEventListener('touchstart', function (e) {
      e.preventDefault();
      self._startClearHold();
    }, { passive: false });
    this.clearBtn.addEventListener('touchend', function () { self._cancelClearHold(); });
    this.clearBtn.addEventListener('touchcancel', function () { self._cancelClearHold(); });
  };

  // ── resize ────────────────────────────────────────────────────────

  App.prototype._handleResize = function () {
    if (this.state === 'WORKSPACE') {
      // Canvas is sized via CSS — the internal resolution stays the same
      // Notify the engine about the new viewport dimensions
      if (this.engine && typeof this.engine.resize === 'function') {
        var rect = this.canvas.getBoundingClientRect();
        this.engine.resize(rect.width, rect.height);
      }
    }
  };

  // ── pinch-to-zoom ────────────────────────────────────────────────

  App.prototype._initPinchZoom = function () {
    var self = this;
    var container = this.canvasContainer;
    if (!container) return;

    // Reset any previous state
    this._zoomLevel = 1;
    this._lastPinchDist = 0;
    this._lastTapTime = 0;
    this._zoomPinchActive = false;

    // Remove any previous listeners to avoid duplicates on re-entry
    this._removePinchZoomListeners();

    this._onTouchStart = function (e) {
      if (e.touches.length === 2) {
        // Two-finger pinch start
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        self._lastPinchDist = Math.sqrt(dx * dx + dy * dy);
        self._zoomPinchActive = true;
      }
    };

    this._onTouchMove = function (e) {
      if (e.touches.length === 2 && self._zoomPinchActive) {
        e.preventDefault();
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (self._lastPinchDist > 0) {
          var scale = dist / self._lastPinchDist;
          self._zoomLevel = Math.max(1, Math.min(4, self._zoomLevel * scale));
          container.style.transform = 'scale(' + self._zoomLevel + ')';
          container.style.transformOrigin = 'center center';
        }

        self._lastPinchDist = dist;
      }
    };

    this._onTouchEnd = function (e) {
      if (e.touches.length < 2) {
        self._zoomPinchActive = false;
        self._lastPinchDist = 0;
      }
    };

    this._onDoubleTap = function (e) {
      var now = Date.now();
      if (now - self._lastTapTime < 300) {
        // Double-tap: reset zoom to 1x
        self._zoomLevel = 1;
        if (container) {
          container.style.transform = 'scale(1)';
        }
        self._lastTapTime = 0;
      } else {
        self._lastTapTime = now;
      }
    };

    container.addEventListener('touchstart', this._onTouchStart, { passive: true });
    container.addEventListener('touchmove', this._onTouchMove, { passive: false });
    container.addEventListener('touchend', this._onTouchEnd, { passive: true });
    container.addEventListener('touchstart', this._onDoubleTap, { passive: true });
  };

  App.prototype._removePinchZoomListeners = function () {
    var container = this.canvasContainer;
    if (!container) return;
    if (this._onTouchStart) container.removeEventListener('touchstart', this._onTouchStart);
    if (this._onTouchMove) container.removeEventListener('touchmove', this._onTouchMove);
    if (this._onTouchEnd) container.removeEventListener('touchend', this._onTouchEnd);
    if (this._onDoubleTap) container.removeEventListener('touchstart', this._onDoubleTap);
  };

  // ── cleanup ───────────────────────────────────────────────────────

  App.prototype._destroyWorkspace = function () {
    // Destroy pointer handler
    if (this.pointerHandler) {
      if (typeof this.pointerHandler.destroy === 'function') {
        this.pointerHandler.destroy();
      }
      this.pointerHandler = null;
    }

    // Destroy engine
    if (this.engine) {
      if (typeof this.engine.destroy === 'function') {
        this.engine.destroy();
      }
      this.engine = null;
    }

    // Clean up pinch-to-zoom listeners
    this._removePinchZoomListeners();

    // Reset canvas container transform
    if (this.canvasContainer) {
      this.canvasContainer.style.transform = '';
      this.canvasContainer.style.transformOrigin = '';
    }
    this._zoomLevel = 1;

    // Clean up palette
    this.paletteEl.innerHTML = '';

    // Cancel any pending clear hold
    this._cancelClearHold();

    // Clear SVG overlay
    this.coloringSvg.innerHTML = '';

    // Clear page backgrounds
    this.pageLeft.style.backgroundImage = '';
    this.pageRight.style.backgroundImage = '';
  };

  // ── export ────────────────────────────────────────────────────────

  window.App = App;
  window.CrayonBoxApp = new App();
})();