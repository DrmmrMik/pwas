/**
 * App — main application orchestrator for CrayonBox.
 *
 * State machine: BOOK_CAROUSEL ⇄ WORKSPACE ⇄ GALLERY
 *
 * Features:
 *   - Stylus (Apple Pencil with 120Hz, pressure, tilt) + Finger Touch + Mouse
 *   - WebGL Wax Crayon Shader + 2D Canvas Procedural Wax Engine fallback
 *   - Smart Flood Fill (Bucket Tool)
 *   - Stay-Inside-The-Lines Mode (SVG Path Clipping Line Assist)
 *   - Wax Sticker Stamps (Star, Heart, Rainbow, Sparkle, Smiley, Flower, Sun, Butterfly, Crown)
 *   - Crayon Brush Sizes (Thin, Medium, Thick)
 *   - Sound Mute Toggle
 *   - Dual Page Carousel Navigation (Left & Right page interactivity)
 *   - Composite Line Art + Drawing Thumbnails
 *   - High-Res PNG Artwork Export in Gallery
 */

(function () {
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

  function App() {
    this.state = 'INIT';
    this.currentPage = 1;
    this.currentMode = 'crayon'; // crayon | fill | stamp | eraser
    this.currentStamp = 'star';
    this.lineAssistActive = false;

    // DOM Elements
    this.loadingEl       = document.getElementById('loading');
    this.bookScreen      = document.getElementById('screen-book-carousel');
    this.workspaceScreen = document.getElementById('screen-workspace');
    this.galleryScreen   = document.getElementById('screen-gallery');
    this.pageLeft        = document.getElementById('pageLeft');
    this.pageRight       = document.getElementById('pageRight');
    this.spineEl         = document.querySelector('.book-spine');
    this.pageIndicator   = document.getElementById('pageIndicator');
    this.prevBtn         = document.getElementById('prevPageBtn');
    this.nextBtn         = document.getElementById('nextPageBtn');
    this.canvas          = document.getElementById('crayon-canvas');
    this.coloringSvg     = document.getElementById('coloringSvg');
    this.canvasContainer = document.querySelector('.canvas-container');
    this.backBtn         = document.getElementById('backBtn');
    this.undoBtn         = document.getElementById('undoBtn');
    this.clearBtn        = document.getElementById('clearBtn');
    this.clearProgress   = document.getElementById('clearProgress');
    this.paletteEl       = document.getElementById('crayonPalette');
    this.colorSwatch     = document.getElementById('colorSwatch');
    this.bookSpread      = document.getElementById('bookSpread');
    this.bookContainer   = document.getElementById('bookContainer');
    this.galleryBtn      = document.getElementById('galleryBtn');
    this.galleryBackBtn  = document.getElementById('galleryBackBtn');
    this.galleryGrid     = document.getElementById('galleryGrid');
    this.rotateOverlay   = document.getElementById('rotateOverlay');
    this.stickerTray     = document.getElementById('stickerTray');
    this.lineAssistBtn   = document.getElementById('lineAssistBtn');
    this.soundMuteBtn    = document.getElementById('soundMuteBtn');

    // Tool Mode & Size Buttons
    this.toolBtns        = document.querySelectorAll('#toolModeGroup .tool-btn');
    this.sizeBtns        = document.querySelectorAll('#brushSizeGroup .size-btn');
    this.stickerOpts     = document.querySelectorAll('.sticker-opt');

    // Engine & Components
    this.engine          = null;
    this.pointerHandler  = null;
    this.storage         = null;
    this.soundEngine     = null;
    this.gestureDetector = null;

    this._clearHoldTimer  = null;
    this._clearHoldActive = false;
    this._selectedColor   = CRAYON_COLORS[0];
    this._svgCache        = {};

    this._onResize = this._handleResize.bind(this);
    this._onOrientationChange = this._handleOrientation.bind(this);

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
    this.storage = new Storage();

    this.storage.init().then(function () {
      self.soundEngine = new SoundEngine();

      self.gestureDetector = new GestureDetector({
        element: self.bookScreen,
        onSwipeLeft: function () { self._goToNextPage(); },
        onSwipeRight: function () { self._goToPrevPage(); },
        onTap: function (e) { self._handleBookTap(e); }
      });

      self._bindEvents();
      self._bindWorkspaceEvents();
      self._enterBookCarousel();
      self._hideLoading();

      window.addEventListener('resize', self._onResize);
      window.addEventListener('orientationchange', self._onOrientationChange);
    }).catch(function (err) {
      console.error('[App] Storage init error:', err);
      self._enterBookCarousel();
      self._hideLoading();
    });
  };

  App.prototype._hideLoading = function () {
    if (this.loadingEl) this.loadingEl.classList.add('hidden');
  };

  App.prototype._setState = function (newState) {
    this.state = newState;
  };

  App.prototype._handleOrientation = function () {
    if (this.state === 'WORKSPACE' && window.innerHeight > window.innerWidth) {
      if (this.rotateOverlay) this.rotateOverlay.classList.add('active');
    } else {
      if (this.rotateOverlay) this.rotateOverlay.classList.remove('active');
    }
  };

  // ── BOOK CAROUSEL ─────────────────────────────────────────────────

  App.prototype._enterBookCarousel = function () {
    var self = this;
    this._setState('BOOK_CAROUSEL');

    this.bookScreen.classList.add('active');
    this.workspaceScreen.classList.remove('active');
    if (this.galleryScreen) this.galleryScreen.classList.remove('active');
    if (this.rotateOverlay) this.rotateOverlay.classList.remove('active');

    this._destroyWorkspace();

    if (!this.gestureDetector) {
      this.gestureDetector = new GestureDetector({
        element: self.bookScreen,
        onSwipeLeft: function () { self._goToNextPage(); },
        onSwipeRight: function () { self._goToPrevPage(); },
        onTap: function (e) { self._handleBookTap(e); }
      });
    }

    this._renderSpread();
    this._updatePageIndicator();
    this._loadThumbnails();
  };

  App.prototype._renderSpread = function () {
    var self = this;
    var page = this.currentPage;
    var rightIdx = page;
    var leftIdx = page > 1 ? page - 1 : PAGE_COUNT;

    this.pageLeft.style.backgroundImage = '';
    this.pageRight.style.backgroundImage = '';

    this._loadSvgInto(leftIdx, this.pageLeft);
    this._loadSvgInto(rightIdx, this.pageRight);

    this._applyThumbnailToPage(leftIdx, this.pageLeft);
    this._applyThumbnailToPage(rightIdx, this.pageRight);

    // Left page click handler
    if (this._onLeftPageClick) this.pageLeft.removeEventListener('click', this._onLeftPageClick);
    this._onLeftPageClick = function () { self._openPageWorkspace(leftIdx); };
    this.pageLeft.addEventListener('click', this._onLeftPageClick);

    // Right page click handler
    if (this._onRightPageClick) this.pageRight.removeEventListener('click', this._onRightPageClick);
    this._onRightPageClick = function () { self._openPageWorkspace(rightIdx); };
    this.pageRight.addEventListener('click', this._onRightPageClick);
  };

  App.prototype._applyThumbnailToPage = function (pageNum, container) {
    var key = 'page_' + String(pageNum).padStart(3, '0');
    this.storage.getPageMeta(key).then(function (meta) {
      var svg = container.querySelector('svg');
      if (meta && meta.thumbnail) {
        var url = URL.createObjectURL(meta.thumbnail);
        container.style.backgroundImage = 'url(' + url + ')';
        container.style.backgroundSize = 'cover';
        container.style.backgroundPosition = 'center';
      }
    }).catch(function () {});
  };

  App.prototype._loadSvgInto = function (pageNum, container) {
    var self = this;
    var key = 'page_' + String(pageNum).padStart(3, '0');

    var applySvg = function (svgText) {
      container.innerHTML = svgText;
      var svg = container.querySelector('svg');
      if (svg) {
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';
      }
    };

    if (this._svgCache[key]) {
      applySvg(this._svgCache[key]);
      return;
    }

    if (window.EMBEDDED_PAGES && window.EMBEDDED_PAGES[key]) {
      this._svgCache[key] = window.EMBEDDED_PAGES[key];
      applySvg(window.EMBEDDED_PAGES[key]);
      return;
    }

    var url = PAGE_PREFIX + key + PAGE_EXT;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        self._svgCache[key] = xhr.responseText;
        applySvg(xhr.responseText);
      }
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
      var leftIdx  = self.currentPage > 1 ? self.currentPage - 1 : PAGE_COUNT;
      var rightIdx = self.currentPage;
      var leftKey  = 'page_' + String(leftIdx).padStart(3, '0');
      var rightKey = 'page_' + String(rightIdx).padStart(3, '0');

      metas.forEach(function (meta) {
        if (meta.thumbnail) {
          var url = URL.createObjectURL(meta.thumbnail);
          if (meta.page_id === leftKey) {
            self.pageLeft.style.backgroundImage = 'url(' + url + ')';
            self.pageLeft.style.backgroundSize = 'cover';
          } else if (meta.page_id === rightKey) {
            self.pageRight.style.backgroundImage = 'url(' + url + ')';
            self.pageRight.style.backgroundSize = 'cover';
          }
        }
      });
    }).catch(function () {});
  };

  App.prototype._goToNextPage = function () {
    var self = this;
    if (this._animatingPage) return;
    this._animatingPage = true;

    if (this.soundEngine) this.soundEngine.playPageTurn();

    setTimeout(function () {
      self.currentPage = self.currentPage >= PAGE_COUNT ? 1 : self.currentPage + 1;
      self._renderSpread();
      self._updatePageIndicator();
      self._animatingPage = false;
    }, 200);
  };

  App.prototype._goToPrevPage = function () {
    var self = this;
    if (this._animatingPage) return;
    this._animatingPage = true;

    if (this.soundEngine) this.soundEngine.playPageTurn();

    setTimeout(function () {
      self.currentPage = self.currentPage <= 1 ? PAGE_COUNT : self.currentPage - 1;
      self._renderSpread();
      self._updatePageIndicator();
      self._animatingPage = false;
    }, 200);
  };

  App.prototype._handleBookTap = function (e) {
    var rect = this.bookScreen.getBoundingClientRect();
    var x = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    var midX = rect.left + rect.width / 2;

    var leftIdx = this.currentPage > 1 ? this.currentPage - 1 : PAGE_COUNT;
    var rightIdx = this.currentPage;

    if (x >= midX) {
      this._openPageWorkspace(rightIdx);
    } else {
      this._openPageWorkspace(leftIdx);
    }
  };

  App.prototype._openPageWorkspace = function (pageNum) {
    this.currentPage = pageNum;
    this._enterWorkspace();
  };

  // ── WORKSPACE ─────────────────────────────────────────────────────

  App.prototype._enterWorkspace = function () {
    var self = this;
    this._setState('WORKSPACE');

    this.workspaceScreen.classList.add('active');
    this.bookScreen.classList.remove('active');

    if (this.gestureDetector) {
      this.gestureDetector.destroy();
      this.gestureDetector = null;
    }

    this._setupCanvas();

    var key = 'page_' + String(this.currentPage).padStart(3, '0');
    var svgContent = this._svgCache[key];
    if (svgContent) {
      this.coloringSvg.innerHTML = svgContent;
    } else {
      this._loadSvgInto(this.currentPage, this.coloringSvg);
    }

    // Init Engine
    if (typeof CrayonEngine !== 'undefined') {
      this.engine = new CrayonEngine();
      this.engine.init(this.canvas);
    }

    // Init PointerHandler
    if (typeof PointerHandler !== 'undefined') {
      this.pointerHandler = new PointerHandler({
        canvas: this.canvas,
        onStrokeStart: function (pt) {
          if (self.soundEngine) self.soundEngine.startFriction();

          // Action based on tool mode
          if (self.currentMode === 'fill') {
            if (self.engine && typeof self.engine.floodFill === 'function') {
              self.engine.floodFill(pt.x, pt.y, self._selectedColor);
              if (self.soundEngine) self.soundEngine.playPop();
              self._autoSaveStroke();
            }
          } else if (self.currentMode === 'stamp') {
            if (self.engine && typeof self.engine.drawStamp === 'function') {
              self.engine.drawStamp(pt.x, pt.y, self.currentStamp, self._selectedColor, 1.0);
              if (self.soundEngine) self.soundEngine.playStamp();
              self._autoSaveStroke();
            }
          } else {
            // Crayon / Eraser stroke
            var color = (self.currentMode === 'eraser') ? '#FFFFFF' : self._selectedColor;
            if (self.engine) {
              self.engine.startStroke(pt.x, pt.y, color, pt.pressure, pt.tilt);
            }
          }
        },
        onStrokePoint: function (pt) {
          if (self.currentMode === 'crayon' || self.currentMode === 'eraser') {
            var color = (self.currentMode === 'eraser') ? '#FFFFFF' : self._selectedColor;
            if (self.engine) {
              self.engine.renderPoint(pt.x, pt.y, color, pt.pressure, pt.tilt);
            }
            if (self.soundEngine) {
              self.soundEngine.updateFriction(pt.pressure || 0.5, pt.velocity || 0);
            }
          }
        },
        onStrokeEnd: function () {
          if (self.engine) self.engine.endStroke();
          if (self.soundEngine) self.soundEngine.stopFriction();
          if (self.currentMode === 'crayon' || self.currentMode === 'eraser') {
            self._autoSaveStroke();
          }
        }
      });
    }

    this._buildPalette();
    this._selectCrayon(this._selectedColor);
    this._loadStrokes();
    this._handleOrientation();
  };

  App.prototype._setupCanvas = function () {
    this.canvas.width  = CANVAS_W;
    this.canvas.height = CANVAS_H;
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

      var tip = document.createElement('div');
      tip.className = 'crayon-tip';
      tip.style.background = color;
      crayon.appendChild(tip);

      crayon.addEventListener('click', function () {
        self._selectCrayon(color);
      });

      wrapper.appendChild(crayon);
      self.paletteEl.appendChild(wrapper);
    });
  };

  App.prototype._selectCrayon = function (color) {
    this._selectedColor = color;

    var crayons = this.paletteEl.querySelectorAll('.crayon');
    crayons.forEach(function (c) {
      c.classList.toggle('selected', c.dataset.color === color);
    });

    if (this.soundEngine) this.soundEngine.playClack();
    if (this.colorSwatch) this.colorSwatch.style.background = color;
  };

  App.prototype._loadStrokes = function () {
    var self = this;
    var pageId = 'page_' + String(this.currentPage).padStart(3, '0');

    this.storage.getPageStrokes(pageId).then(function (data) {
      if (data.raster_blob) {
        var img = new Image();
        img.onload = function () {
          var ctx = self.canvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(data.raster_blob);
      }
    }).catch(function () {});
  };

  App.prototype._autoSaveStroke = function () {
    var self = this;
    var pageId = 'page_' + String(this.currentPage).padStart(3, '0');

    this.canvas.toBlob(function (rasterBlob) {
      if (!rasterBlob) return;
      self.storage.autoSave(pageId, rasterBlob, []);
      self._generateCompositeThumbnail(function (thumbBlob) {
        if (thumbBlob) {
          self.storage.savePageMeta(pageId, 'Page ' + self.currentPage, thumbBlob, Date.now(), true);
        }
      });
    }, 'image/png');
  };

  App.prototype._generateCompositeThumbnail = function (callback) {
    var thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 512;
    thumbCanvas.height = 384;
    var ctx = thumbCanvas.getContext('2d');

    // Fill paper background
    ctx.fillStyle = '#F4EAD5';
    ctx.fillRect(0, 0, 512, 384);

    // Draw user artwork canvas
    ctx.drawImage(this.canvas, 0, 0, 512, 384);

    // Draw SVG lineart template overlay
    var svgEl = this.coloringSvg.querySelector('svg');
    if (svgEl) {
      var xml = new XMLSerializer().serializeToString(svgEl);
      var svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(svgBlob);
      var img = new Image();
      img.onload = function () {
        ctx.drawImage(img, 0, 0, 512, 384);
        URL.revokeObjectURL(url);
        thumbCanvas.toBlob(callback, 'image/png');
      };
      img.src = url;
    } else {
      thumbCanvas.toBlob(callback, 'image/png');
    }
  };

  // ── WORKSPACE EVENTS & TOOLBAR ───────────────────────────────────

  App.prototype._bindEvents = function () {
    var self = this;

    this.prevBtn.addEventListener('click', function () { self._goToPrevPage(); });
    this.nextBtn.addEventListener('click', function () { self._goToNextPage(); });

    if (this.galleryBtn) {
      this.galleryBtn.addEventListener('click', function () { self._openGallery(); });
    }

    if (this.galleryBackBtn) {
      this.galleryBackBtn.addEventListener('click', function () { self._enterBookCarousel(); });
    }
  };

  App.prototype._bindWorkspaceEvents = function () {
    var self = this;

    this.backBtn.addEventListener('click', function () { self._backToBook(); });

    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', function () { self._undoLastStroke(); });
    }

    // Clear hold
    this.clearBtn.addEventListener('mousedown', function () { self._startClearHold(); });
    this.clearBtn.addEventListener('mouseup', function () { self._cancelClearHold(); });
    this.clearBtn.addEventListener('mouseleave', function () { self._cancelClearHold(); });
    this.clearBtn.addEventListener('touchstart', function (e) {
      e.preventDefault(); self._startClearHold();
    }, { passive: false });
    this.clearBtn.addEventListener('touchend', function () { self._cancelClearHold(); });

    // Tool Mode selector
    this.toolBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.dataset.mode;
        self._setToolMode(mode);
      });
    });

    // Brush Size selector
    this.sizeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var size = btn.dataset.size;
        self.sizeBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        var mult = 1.0;
        if (size === 'thin') mult = 0.5;
        if (size === 'thick') mult = 1.8;
        if (self.engine) self.engine.setBrushSizeMultiplier(mult);
        if (self.soundEngine) self.soundEngine.playClack();
      });
    });

    // Sticker selection
    this.stickerOpts.forEach(function (opt) {
      opt.addEventListener('click', function () {
        self.stickerOpts.forEach(function (o) { o.classList.remove('active'); });
        opt.classList.add('active');
        self.currentStamp = opt.dataset.stamp;
        if (self.soundEngine) self.soundEngine.playClack();
      });
    });

    // Line Assist toggle
    if (this.lineAssistBtn) {
      this.lineAssistBtn.addEventListener('click', function () {
        self.lineAssistActive = !self.lineAssistActive;
        self.lineAssistBtn.classList.toggle('active', self.lineAssistActive);
        if (self.soundEngine) self.soundEngine.playClack();
      });
    }

    // Sound Mute toggle
    if (this.soundMuteBtn) {
      this.soundMuteBtn.addEventListener('click', function () {
        if (self.soundEngine) {
          var isMuted = self.soundEngine.toggleMute();
          self.soundMuteBtn.textContent = isMuted ? '🔇' : '🔊';
        }
      });
    }
  };

  App.prototype._setToolMode = function (mode) {
    this.currentMode = mode;
    this.toolBtns.forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    if (this.stickerTray) {
      this.stickerTray.classList.toggle('hidden', mode !== 'stamp');
    }

    if (this.soundEngine) this.soundEngine.playClack();
  };

  App.prototype._backToBook = function () {
    var self = this;
    var pageId = 'page_' + String(this.currentPage).padStart(3, '0');

    this.canvas.toBlob(function (rasterBlob) {
      if (!rasterBlob) return;
      self.storage.savePageStrokes(pageId, rasterBlob, []).then(function () {
        self._generateCompositeThumbnail(function (thumbBlob) {
          if (thumbBlob) {
            self.storage.savePageMeta(pageId, 'Page ' + self.currentPage, thumbBlob, Date.now(), false);
          }
          self._enterBookCarousel();
        });
      }).catch(function () { self._enterBookCarousel(); });
    }, 'image/png');
  };

  App.prototype._undoLastStroke = function () {
    if (this.engine) this.engine.clear();
    this._loadStrokes();
    if (this.soundEngine) this.soundEngine.playPop();
  };

  App.prototype._clearCanvas = function () {
    if (this.engine) this.engine.clear();
    this._autoSaveStroke();
    if (this.soundEngine) this.soundEngine.playClear();
  };

  App.prototype._startClearHold = function () {
    var self = this;
    if (this._clearHoldTimer) return;
    this._clearHoldActive = false;

    if (this.clearProgress) this.clearProgress.classList.add('active');
    if (this.soundEngine) this.soundEngine.startClearTone();

    this._clearHoldTimer = setTimeout(function () {
      self._clearHoldActive = true;
      if (self.soundEngine) {
        self.soundEngine.stopClearTone();
        self.soundEngine.playClear();
      }
      self._clearCanvas();
      if (self.clearProgress) self.clearProgress.classList.remove('active');
      self._clearHoldTimer = null;
    }, 1500);
  };

  App.prototype._cancelClearHold = function () {
    if (this._clearHoldTimer) {
      clearTimeout(this._clearHoldTimer);
      this._clearHoldTimer = null;
    }
    if (this.clearProgress) this.clearProgress.classList.remove('active');
    if (this.soundEngine) this.soundEngine.stopClearTone();
    this._clearHoldActive = false;
  };

  // ── GALLERY & PNG EXPORT ──────────────────────────────────────────

  App.prototype._openGallery = function () {
    this._setState('GALLERY');
    this.galleryScreen.classList.add('active');
    this.bookScreen.classList.remove('active');

    if (this.gestureDetector) {
      this.gestureDetector.destroy();
      this.gestureDetector = null;
    }

    this._renderGallery();
  };

  App.prototype._renderGallery = function () {
    var self = this;
    this.galleryGrid.innerHTML = '<div class="gallery-empty">No artwork saved yet — start coloring in the book!</div>';

    this.storage.getAllPageMeta().then(function (metas) {
      var withThumbs = metas.filter(function (m) { return m.thumbnail; });
      if (withThumbs.length === 0) return;

      self.galleryGrid.innerHTML = '';

      withThumbs.forEach(function (meta) {
        var item = document.createElement('div');
        item.className = 'gallery-item';

        var img = document.createElement('img');
        var thumbUrl = URL.createObjectURL(meta.thumbnail);
        img.src = thumbUrl;
        img.alt = meta.title || meta.page_id;
        item.appendChild(img);

        var label = document.createElement('div');
        label.className = 'gallery-item-label';
        label.innerHTML = '<span>' + (meta.title || meta.page_id) + '</span>';

        // Download PNG button
        var dlBtn = document.createElement('button');
        dlBtn.className = 'gallery-download-btn';
        dlBtn.textContent = '💾 Save PNG';
        dlBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          self._exportArtworkPNG(meta.page_id);
        });

        label.appendChild(dlBtn);
        item.appendChild(label);

        item.addEventListener('click', function () {
          var pageNum = parseInt(meta.page_id.replace('page_', ''), 10);
          if (pageNum >= 1 && pageNum <= PAGE_COUNT) {
            self.currentPage = pageNum;
            self._enterWorkspace();
          }
        });

        self.galleryGrid.appendChild(item);
      });
    }).catch(function () {});
  };

  App.prototype._exportArtworkPNG = function (pageId) {
    var self = this;
    this.storage.getPageMeta(pageId).then(function (meta) {
      if (meta && meta.thumbnail) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(meta.thumbnail);
        a.download = pageId + '_artwork.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  };

  App.prototype._handleResize = function () {};

  App.prototype._destroyWorkspace = function () {
    if (this.pointerHandler) {
      this.pointerHandler.destroy();
      this.pointerHandler = null;
    }
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    this.paletteEl.innerHTML = '';
    this._cancelClearHold();
    this.coloringSvg.innerHTML = '';
  };

  window.App = App;
  window.CrayonBoxApp = new App();
})();