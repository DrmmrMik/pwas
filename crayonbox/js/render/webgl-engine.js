/**
 * webgl-engine.js — WebGL2 Crayon Rendering Engine
 * CrayonBox PWA
 *
 * Renders wax crayon strokes using WebGL2 point sprites with:
 *   - Catmull-Rom interpolation for smooth curves
 *   - Perlin-noise-based wobble on stroke edges (irregular crayon texture)
 *   - Pressure and tilt-modulated point size
 *   - Three-layer compositing: paper background | WebGL pigment | SVG overlay
 *   - Display P3 colour space output
 *   - Subtractive (wax) blending
 */

(function () {
  'use strict';

  // ─── Noise helpers for stroke wobble ───

  // Simple 2D Perlin noise implementation (for stroke-edge wobble)
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
    return (_lerp(x1, x2, v) + 1) / 2; // map [-1,1] → [0,1]
  }

  // ─── Catmull-Rom helpers ───

  function _catmullRom(p0, p1, p2, p3, t) {
    var t2 = t * t;
    var t3 = t2 * t;
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

  // ─── WebGL Engine ───

  /**
   * CrayonEngine — WebGL2 rendering engine for wax crayon simulation.
   *
   * Usage:
   *   var engine = new CrayonEngine();
   *   engine.init(canvasElement);
   *   engine.renderStroke(points, color, pressure, tilt);
   */
  function CrayonEngine() {
    this.gl = null;
    this.program = null;
    this.canvas = null;

    // Uniform locations
    this.uProjection = null;
    this.uPointSize = null;
    this.uPaperHeightmap = null;
    this.uWaxGrain = null;
    this.uResolution = null;

    // Attribute locations
    this.aPosition = null;
    this.aPressure = null;
    this.aTexCoord = null;
    this.aColor = null;

    // Buffers
    this.positionBuffer = null;
    this.pressureBuffer = null;
    this.texCoordBuffer = null;
    this.colorBuffer = null;

    // Textures
    this.paperTexture = null;
    this.waxGrainTexture = null;

    // Canvas/paper dimensions
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    // Performance
    this._pointCache = [];

    // Stroke history for persistence
    this._strokeHistory = [];
    this._currentColor = null;
    this._eraserMode = false;
  }

  /**
   * init(canvas)
   * Creates the WebGL2 context and sets up the rendering pipeline.
   *
   * @param {HTMLCanvasElement} canvas
   * @returns {boolean} true if initialisation succeeded
   */
  CrayonEngine.prototype.init = function (canvas) {
    this.canvas = canvas;
    this.dpr = window.devicePixelRatio || 1;

    var gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      desynchronized: true,
      premultipliedAlpha: true,
      depth: false,
      stencil: false
    });

    if (!gl) {
      console.error('CrayonEngine: WebGL2 not supported');
      return false;
    }

    this.gl = gl;

    // Display P3 color space — if available
    if (gl.drawingBufferColorSpace !== undefined) {
      try {
        gl.drawingBufferColorSpace = 'display-p3';
      } catch (e) {
        console.warn('CrayonEngine: display-p3 not supported, falling back to srgb');
      }
    }

    // Set up blending — subtractive wax blending mode
    // This simulates how wax crayons layer: each stroke subtracts from the paper
    // dst.rgb = dst.rgb * (1 - src.a) + src.rgb * 0  → pure subtractive
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this._createBuffers();
    this._createPaperTexture();
    this._createWaxGrainTexture();
    this.compileShaders();

    return true;
  };

  /**
   * _createBuffers
   * Creates the vertex attribute buffers used for stroke rendering.
   */
  CrayonEngine.prototype._createBuffers = function () {
    var gl = this.gl;
    if (!gl) return;

    this.positionBuffer = gl.createBuffer();
    this.pressureBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();
    this.colorBuffer = gl.createBuffer();
  };

  /**
   * _createPaperTexture
   * Generates a procedural paper heightmap using the generatePaperTexture
   * function from paper-texture.js and uploads it to a WebGL texture unit.
   */
  CrayonEngine.prototype._createPaperTexture = function () {
    var gl = this.gl;
    if (!gl) return;

    // Try to use the paper-texture module; fall back to a flat white texture
    var paperCanvas;
    if (typeof generatePaperTexture === 'function') {
      paperCanvas = generatePaperTexture({ width: 1024, height: 1024 });
    } else {
      // Fallback: create a plain white 2x2 texture
      paperCanvas = document.createElement('canvas');
      paperCanvas.width = 2;
      paperCanvas.height = 2;
      var ctx = paperCanvas.getContext('2d');
      ctx.fillStyle = '#F4EAD5';
      ctx.fillRect(0, 0, 2, 2);
    }

    this.paperTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, paperCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  /**
   * _createWaxGrainTexture
   * Generates a small procedural noise texture used for wax pigment variation.
   */
  CrayonEngine.prototype._createWaxGrainTexture = function () {
    var gl = this.gl;
    if (!gl) return;

    var size = 512;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var imageData = ctx.createImageData(size, size);
    var data = imageData.data;

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var nx = x / size;
        var ny = y / size;
        // Simplex-like grain: layered high-frequency noise
        var v = _perlin2D(nx * 16, ny * 16) * 0.7 +
                _perlin2D(nx * 32, ny * 32) * 0.2 +
                Math.random() * 0.1;
        v = Math.max(0, Math.min(1, v));
        var idx = (y * size + x) * 4;
        var byteVal = Math.round(v * 255);
        data[idx + 0] = byteVal;
        data[idx + 1] = byteVal;
        data[idx + 2] = byteVal;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    this.waxGrainTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.waxGrainTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
  };

  /**
   * compileShaders()
   * Compiles vertex and fragment shaders from shaders.js.
   *
   * @returns {boolean} true if compilation and linking succeeded
   */
  CrayonEngine.prototype.compileShaders = function () {
    var gl = this.gl;
    if (!gl) return false;

    // Resolve shader sources — prefer module export, fall back to global
    var vsSrc = (typeof vertexShaderSrc !== 'undefined')
      ? vertexShaderSrc
      : null;
    var fsSrc = (typeof fragmentShaderSrc !== 'undefined')
      ? fragmentShaderSrc
      : null;

    if (!vsSrc || !fsSrc) {
      console.error('CrayonEngine: shader sources not found. Ensure shaders.js is loaded.');
      return false;
    }

    var vertexShader = this._compileShader(gl.VERTEX_SHADER, vsSrc);
    var fragmentShader = this._compileShader(gl.FRAGMENT_SHADER, fsSrc);

    if (!vertexShader || !fragmentShader) return false;

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('CrayonEngine: program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    // Clean up shader objects (they're linked into the program now)
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    this.program = program;

    // Cache attribute and uniform locations
    this.aPosition = gl.getAttribLocation(program, 'a_position');
    this.aPressure = gl.getAttribLocation(program, 'a_pressure');
    this.aTexCoord = gl.getAttribLocation(program, 'a_texCoord');
    this.aColor = gl.getAttribLocation(program, 'a_color');

    this.uProjection = gl.getUniformLocation(program, 'u_projection');
    this.uPointSize = gl.getUniformLocation(program, 'u_pointSize');
    this.uPaperHeightmap = gl.getUniformLocation(program, 'u_paperHeightmap');
    this.uWaxGrain = gl.getUniformLocation(program, 'u_waxGrain');
    this.uResolution = gl.getUniformLocation(program, 'u_resolution');

    return true;
  };

  /**
   * _compileShader(type, source)
   * Compiles a single GLSL shader and returns it.
   */
  CrayonEngine.prototype._compileShader = function (type, source) {
    var gl = this.gl;
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var typeName = type === gl.VERTEX_SHADER ? 'vertex' : 'fragment';
      console.error('CrayonEngine: ' + typeName + ' shader compile error:',
        gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  /**
   * renderStroke(points, color, pressure, tilt)
   * Renders a smooth crayon stroke from an array of input points using
   * WebGL2 point sprites.
   *
   * @param {Array<{x: number, y: number, pressure?: number}>} points
   * @param {number[]|string} color — RGB array [0-1] or hex string
   * @param {number} [pressure=0.5] — overall pressure [0, 1]
   * @param {number} [tilt=0] — tilt angle in radians
   */
  CrayonEngine.prototype.renderStroke = function (points, color, pressure, tilt) {
    var gl = this.gl;
    if (!gl || !this.program || !points || points.length < 2) return;

    pressure = (pressure !== undefined && pressure !== null) ? pressure : 0.5;
    tilt = tilt || 0;

    // Parse color
    var colorVec = this._parseColor(color);

    // Interpolate extra points via Catmull-Rom
    var interpolated = this._interpolatePoints(points);

    // Apply Perlin noise wobble to stroke positions
    var wobbled = this._applyWobble(interpolated, pressure);

    // Calculate point sprite size based on pressure and tilt
    var baseSize = 12 + pressure * 28; // 12–40px base
    var tiltWiden = 1 + Math.sin(tilt) * 0.4; // up to 40% wider when tilted
    var pointSize = baseSize * tiltWiden * this.dpr;
    pointSize = Math.max(4, Math.min(120, pointSize));

    // Build vertex data arrays
    var numPoints = wobbled.length;
    var positions = new Float32Array(numPoints * 2);
    var pressures = new Float32Array(numPoints);
    var texCoords = new Float32Array(numPoints * 2);
    var colors = new Float32Array(numPoints * 3);

    // Build projection matrix (orthographic, NDC)
    // Canvas coords → NDC: x: [0, w] → [-1, 1], y: [0, h] → [-1, 1]
    var w = this.canvas.width / this.dpr;
    var h = this.canvas.height / this.dpr;
    var projection = new Float32Array([
      2 / w, 0, 0,
      0, -2 / h, 0,
      -1, 1, 1
    ]);

    for (var i = 0; i < numPoints; i++) {
      var p = wobbled[i];
      var idx2 = i * 2;

      positions[idx2] = p.x;
      positions[idx2 + 1] = p.y;

      // Pressure per-point (from the interpolated data or overall)
      pressures[i] = p.pressure !== undefined ? p.pressure : pressure;

      // Texture coordinates — map canvas position to [0,1] for noise sampling
      texCoords[idx2] = p.x / w;
      texCoords[idx2 + 1] = p.y / h;

      // Color per-vertex (constant for the stroke)
      colors[idx2] = colorVec[0];
      colors[idx2 + 1] = colorVec[1];
      colors[idx2 + 2] = colorVec[2];
    }

    // ─── Upload data and draw ───
    gl.useProgram(this.program);

    // Set uniforms
    gl.uniformMatrix3fv(this.uProjection, false, projection);
    gl.uniform1f(this.uPointSize, pointSize);
    gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.paperTexture);
    gl.uniform1i(this.uPaperHeightmap, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.waxGrainTexture);
    gl.uniform1i(this.uWaxGrain, 1);

    // Upload position
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 2, gl.FLOAT, false, 0, 0);

    // Upload pressure
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pressureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pressures, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aPressure);
    gl.vertexAttribPointer(this.aPressure, 1, gl.FLOAT, false, 0, 0);

    // Upload texCoords
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aTexCoord);
    gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);

    // Upload colors
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 3, gl.FLOAT, false, 0, 0);

    // Draw as points (each becomes a point sprite)
    gl.drawArrays(gl.POINTS, 0, numPoints);

    // Cleanup attribute state
    gl.disableVertexAttribArray(this.aPosition);
    gl.disableVertexAttribArray(this.aPressure);
    gl.disableVertexAttribArray(this.aTexCoord);
    gl.disableVertexAttribArray(this.aColor);
  };

  /**
   * _interpolatePoints(rawPoints)
   * Applies Catmull-Rom spline interpolation to produce a smooth curve
   * from the input raw pointer samples.
   *
   * @param {Array<{x, y, pressure?}>} rawPoints
   * @returns {Array<{x, y, pressure?}>}
   */
  CrayonEngine.prototype._interpolatePoints = function (rawPoints) {
    if (rawPoints.length < 2) return rawPoints.slice();

    var result = [];
    var segments = 6; // subdivisions per control segment

    for (var i = 0; i < rawPoints.length - 1; i++) {
      var p0 = rawPoints[Math.max(0, i - 1)];
      var p1 = rawPoints[i];
      var p2 = rawPoints[i + 1];
      var p3 = rawPoints[Math.min(rawPoints.length - 1, i + 2)];

      for (var s = 0; s < segments; s++) {
        var t = s / segments;
        var pt = _catmullRomPoint(p0, p1, p2, p3, t);
        // Interpolate pressure too
        pt.pressure = p1.pressure !== undefined
          ? _lerp(p1.pressure, p2.pressure || p1.pressure, t)
          : undefined;
        result.push(pt);
      }
    }

    // Include the last raw point
    result.push(rawPoints[rawPoints.length - 1]);
    return result;
  };

  /**
   * _applyWobble(points, pressure)
   * Applies Perlin noise displacement to each point to simulate the
   * irregular edge of a real wax crayon.
   *
   * P_wobble(t) = C(t) + n(t) * [A_base * N(f*x, f*y) * (1.0 - 0.4*pressure)]
   *
   * where A_base=1.5, f=0.08
   */
  CrayonEngine.prototype._applyWobble = function (points, pressure) {
    if (!points || points.length === 0) return points;

    var A_base = 1.5;
    var f = 0.08;

    var result = [];
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var noiseVal = _perlin2D(p.x * f, p.y * f);
      var displacement = A_base * noiseVal * (1.0 - 0.4 * (pressure || 0.5));
      // n(t) for temporal noise — use a hash of the point index
      var temporalNoise = Math.sin(i * 0.5) * 0.5 + 0.5;

      result.push({
        x: p.x + displacement * temporalNoise,
        y: p.y + displacement * temporalNoise,
        pressure: p.pressure
      });
    }

    return result;
  };

  /**
   * _parseColor(color)
   * Converts a color value to an [r, g, b] float array in [0, 1].
   * Accepts hex strings (#RRGGBB) or [r, g, b] arrays.
   */
  CrayonEngine.prototype._parseColor = function (color) {
    if (Array.isArray(color)) {
      return [
        Math.max(0, Math.min(1, color[0])),
        Math.max(0, Math.min(1, color[1])),
        Math.max(0, Math.min(1, color[2]))
      ];
    }

    if (typeof color === 'string') {
      var hex = color.replace('#', '');
      var r = parseInt(hex.substring(0, 2), 16) / 255;
      var g = parseInt(hex.substring(2, 4), 16) / 255;
      var b = parseInt(hex.substring(4, 6), 16) / 255;
      return [r, g, b];
    }

    // Default to black
    return [0, 0, 0];
  };

  /**
   * clear()
   * Clears the WebGL canvas to the paper background colour (#F4EAD5).
   */
  CrayonEngine.prototype.clear = function () {
    var gl = this.gl;
    if (!gl) return;

    // Warm paper colour in linear sRGB
    gl.clearColor(0.957, 0.918, 0.835, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  /**
   * getCanvasState()
   * Returns the current canvas pixel data as ImageData for saving/restore.
   *
   * @returns {ImageData|null}
   */
  CrayonEngine.prototype.getCanvasState = function () {
    var gl = this.gl;
    if (!gl) return null;

    var w = gl.drawingBufferWidth;
    var h = gl.drawingBufferHeight;
    var pixels = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Return as ImageData (note: readPixels reads from bottom-left)
    // For full fidelity we'd flip, but for save/restore cycles we keep as-is
    // since restoreState writes back the same way.
    return {
      width: w,
      height: h,
      data: pixels
    };
  };

  /**
   * restoreState(imageData)
   * Restores the WebGL canvas from previously saved pixel data.
   *
   * @param {object} imageData — object with {width, height, data} as returned
   *                             by getCanvasState()
   */
  CrayonEngine.prototype.restoreState = function (imageData) {
    var gl = this.gl;
    if (!gl || !imageData) return;

    var pixels = imageData.data;
    if (!pixels) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.blendFuncSeparate(gl.ONE, gl.ZERO, gl.ONE, gl.ZERO); // overwrite mode
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imageData.width, imageData.height,
      0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Draw the stored pixels back to the framebuffer
    this.clear();
    // Use gl.readPixels / texImage2D approach: we upload as a texture and
    // render a full-quad. For simplicity, just draw the pixels as a full-screen quad.
    this._drawFullQuad(pixels, imageData.width, imageData.height);
  };

  /**
   * _drawFullQuad(pixelData, w, h)
   * Renders a full-screen textured quad from raw pixel data.
   * Used internally by restoreState().
   */
  CrayonEngine.prototype._drawFullQuad = function (pixelData, w, h) {
    var gl = this.gl;
    if (!gl) return;

    // Create a temporary texture from the pixel data
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Simple full-quad vertex/fragment shaders
    var vs = this._compileShader(gl.VERTEX_SHADER,
      '#version 300 es\n' +
      'in vec2 a_pos;\n' +
      'out vec2 v_uv;\n' +
      'void main() {\n' +
      '  v_uv = a_pos * 0.5 + 0.5;\n' +
      '  gl_Position = vec4(a_pos, 0.0, 1.0);\n' +
      '}'
    );
    var fs = this._compileShader(gl.FRAGMENT_SHADER,
      '#version 300 es\n' +
      'precision highp float;\n' +
      'in vec2 v_uv;\n' +
      'uniform sampler2D u_tex;\n' +
      'out vec4 fragColor;\n' +
      'void main() {\n' +
      '  fragColor = texture(u_tex, v_uv);\n' +
      '}'
    );

    if (!vs || !fs) {
      gl.deleteTexture(tex);
      return;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      gl.deleteTexture(tex);
      return;
    }

    gl.useProgram(prog);

    var aPos = gl.getAttribLocation(prog, 'a_pos');
    var uTex = gl.getUniformLocation(prog, 'u_tex');

    // Full-screen quad vertices (NDC)
    var verts = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
      -1,  1,
       1, -1
    ]);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uTex, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Cleanup
    gl.disableVertexAttribArray(aPos);
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteTexture(tex);

    // Restore the original program
    gl.useProgram(this.program);
  };

  /**
   * resize(width, height)
   * Handles canvas resize, updating the viewport and projection.
   *
   * @param {number} width  — CSS pixel width
   * @param {number} height — CSS pixel height
   */
  CrayonEngine.prototype.resize = function (width, height) {
    var gl = this.gl;
    if (!gl) return;

    this.width = width;
    this.height = height;

    var dpr = this.dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Re-create paper texture at the new resolution if needed
    // (For performance we keep the existing 1024x1024 texture, it tiles)
  };

  /**
   * destroy()
   * Tears down the WebGL context and releases resources.
   */
  CrayonEngine.prototype.destroy = function () {
    var gl = this.gl;
    if (!gl) return;

    if (this.program) gl.deleteProgram(this.program);
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.pressureBuffer) gl.deleteBuffer(this.pressureBuffer);
    if (this.texCoordBuffer) gl.deleteBuffer(this.texCoordBuffer);
    if (this.colorBuffer) gl.deleteBuffer(this.colorBuffer);
    if (this.paperTexture) gl.deleteTexture(this.paperTexture);
    if (this.waxGrainTexture) gl.deleteTexture(this.waxGrainTexture);

    this.gl = null;
    this.program = null;
    this.canvas = null;
  };

  /**
   * setColor(color)
   * Stores the current drawing color for future strokes.
   * @param {string} color — hex string (#RRGGBB)
   */
  CrayonEngine.prototype.setColor = function (color) {
    this._currentColor = color;
  };

  /**
   * setEraser(isEraser)
   * Enables or disables eraser mode.
   * @param {boolean} isEraser
   */
  CrayonEngine.prototype.setEraser = function (isEraser) {
    this._eraserMode = !!isEraser;
  };

  /**
   * getStrokeHistory()
   * Returns the array of recorded stroke descriptors.
   * @returns {Array}
   */
  CrayonEngine.prototype.getStrokeHistory = function () {
    return this._strokeHistory || [];
  };

  /**
   * resetStrokeHistory()
   * Clears the stroke history array.
   */
  CrayonEngine.prototype.resetStrokeHistory = function () {
    this._strokeHistory = [];
  };

  /**
   * loadStrokeHistory(history)
   * Replaces the internal stroke history with previously saved data.
   * @param {Array} history
   */
  CrayonEngine.prototype.loadStrokeHistory = function (history) {
    this._strokeHistory = Array.isArray(history) ? history.slice() : [];
  };

  /**
   * loadImage(img)
   * Loads an HTMLImageElement into the WebGL canvas via texImage2D.
   * Used when restoring saved page state.
   * @param {HTMLImageElement} img
   */
  CrayonEngine.prototype.loadImage = function (img) {
    var gl = this.gl;
    if (!gl || !img) return;

    // Draw the image into a temporary canvas for WebGL upload
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = img.naturalWidth || this.canvas.width;
    tmpCanvas.height = img.naturalHeight || this.canvas.height;
    var ctx = tmpCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Upload as a texture and render full-quad
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmpCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Use the existing _drawFullQuad approach — but we need the temp texture bound
    // Render a full-screen quad with this texture using a simple shader
    var vs = this._compileShader(gl.VERTEX_SHADER,
      '#version 300 es\n' +
      'in vec2 a_pos;\n' +
      'out vec2 v_uv;\n' +
      'void main() {\n' +
      '  v_uv = a_pos * 0.5 + 0.5;\n' +
      '  gl_Position = vec4(a_pos, 0.0, 1.0);\n' +
      '}'
    );
    var fs = this._compileShader(gl.FRAGMENT_SHADER,
      '#version 300 es\n' +
      'precision highp float;\n' +
      'in vec2 v_uv;\n' +
      'uniform sampler2D u_tex;\n' +
      'out vec4 fragColor;\n' +
      'void main() {\n' +
      '  fragColor = texture(u_tex, v_uv);\n' +
      '}'
    );

    if (!vs || !fs) {
      gl.deleteTexture(tex);
      return;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      gl.deleteTexture(tex);
      return;
    }

    gl.useProgram(prog);

    var aPos = gl.getAttribLocation(prog, 'a_pos');
    var uTex = gl.getUniformLocation(prog, 'u_tex');

    // Overwrite blend mode
    gl.blendFuncSeparate(gl.ONE, gl.ZERO, gl.ONE, gl.ZERO);

    var verts = new Float32Array([
      -1, -1, 1, -1, -1, 1,
       1,  1, -1, 1,  1, -1
    ]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(uTex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Cleanup
    gl.disableVertexAttribArray(aPos);
    gl.deleteBuffer(buf);
    gl.deleteProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteTexture(tex);

    // Restore the subtractive blend mode and main program
    gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (this.program) {
      gl.useProgram(this.program);
    }
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CrayonEngine };
  } else {
    window.CrayonEngine = CrayonEngine;
  }
})();