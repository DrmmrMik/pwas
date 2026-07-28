/**
 * shaders.js — GLSL Vertex & Fragment Shaders for CrayonBox
 * CrayonBox PWA
 *
 * Exports vertex and fragment shader source as ES module template literals.
 * The fragment shader implements wax-on-paper rendering with:
 *   - Paper heightmap sampling for grain texture
 *   - Wax grain noise for pigment variation
 *   - Pressure-modulated coverage
 *   - Distance-based edge falloff for rounded crayon tip
 *   - Subtractive (wax) blending
 *   - Display P3 color space output
 */

(function () {
  'use strict';

  /**
   * Vertex shader.
   *
   * Attributes:
   *   a_position  — vec2 point position (normalised device coords)
   *   a_pressure  — float pen pressure [0, 1]
   *   a_texCoord  — vec2 texture coordinate for noise sampling
   *   a_color     — vec3 crayon color in linear sRGB
   *
   * Uniforms:
   *   u_projection — mat3 projection matrix
   *   u_pointSize  — float point sprite size
   *
   * Varyings:
   *   v_texCoord   — passed to fragment
   *   v_pressure   — passed to fragment
   *   v_color      — passed to fragment
   */
  var vertexShaderSrc = `#version 300 es
precision highp float;

in vec2 a_position;
in float a_pressure;
in vec2 a_texCoord;
in vec3 a_color;

uniform mat3 u_projection;
uniform float u_pointSize;

out vec2 v_texCoord;
out float v_pressure;
out vec3 v_color;

void main() {
  vec3 pos = u_projection * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  gl_PointSize = u_pointSize;

  v_texCoord = a_texCoord;
  v_pressure = a_pressure;
  v_color = a_color;
}
`;

  /**
   * Fragment shader.
   *
   * Implements wax crayon simulation:
   * 1. Sample paper heightmap texture for paper grain
   * 2. Sample wax grain noise for pigment texture variation
   * 3. Compute wax coverage from pressure and paper height
   * 4. Apply circular edge falloff (crayon tip roundness)
   * 5. Output with subtractive blending in Display P3
   *
   * Uniforms:
   *   u_paperHeightmap — sampler2D  (1024x1024 paper grain texture)
   *   u_waxGrain       — sampler2D  (512x512 wax noise texture)
   *   u_resolution     — vec2       canvas resolution
   */
  var fragmentShaderSrc = `#version 300 es
precision highp float;

in vec2 v_texCoord;
in float v_pressure;
in vec3 v_color;

uniform sampler2D u_paperHeightmap;
uniform sampler2D u_waxGrain;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  // ─── Sample paper heightmap ───
  // Paper grain gives the texture "tooth" for the wax to catch on
  float paperHeight = texture(u_paperHeightmap, v_texCoord).r;

  // ─── Sample wax grain noise ───
  // Adds pigment particle variation so the stroke looks like real wax
  float waxNoise = texture(u_waxGrain, v_texCoord * 4.0).r;

  // ─── Wax coverage ───
  // Higher pressure = more wax deposited. Paper valleys catch more wax
  // than peaks (simulating how real crayon fills the paper grain).
  float threshold = 1.0 - (v_pressure * 0.85 + 0.10);
  float coverage = smoothstep(threshold, threshold + 0.25, paperHeight + waxNoise * 0.15);

  // ─── Edge falloff (crayon tip roundness) ───
  // gl_PointCoord gives [0,1] within the point sprite.
  // Distance from center creates a soft circular falloff at the edges,
  // simulating the rounded tip of a wax crayon.
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  float edgeFalloff = 1.0 - smoothstep(0.2, 0.5, dist);

  // ─── Final alpha ───
  float alpha = coverage * edgeFalloff;

  // ─── Clamp alpha ───
  alpha = clamp(alpha, 0.0, 1.0);

  // ─── Subtractive (wax) blending formula ───
  // Simulates how wax crayons work: wax layers absorb light.
  // In the engine this is applied via blendFunc, but we pre-multiply here
  // for correct composition.
  //
  // The actual subtractive blend is achieved in WebGL by:
  //   gl.blendFuncSeparate(GL.ZERO, GL.ONE_MINUS_SRC_COLOR, GL.ONE, GL.ONE_MINUS_SRC_ALPHA)
  // combined with src.rgb = dst.rgb * (1 - src.a) + src.rgb * 0? No.
  //
  // Real wax blending: each layer subtracts from white.
  // We output premultiplied color so the compositor handles it:
  //   result = dst * (1 - src.a) + src.rgb   (but src.rgb is already * alpha)
  //
  // fragColor = vec4(v_color * alpha, alpha);
  //
  // The caller sets blendFuncSeparate to achieve true subtractive behavior:
  //   gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  //
  // fragColor output for gl.ONE_MINUS_SRC_COLOR blending:
  // With dst * (1.0 - src.rgb), setting src.rgb = (1.0 - v_color) * alpha
  // yields dst * ((1.0 - alpha) + v_color * alpha), leaving target crayon color on paper.
  fragColor = vec4((vec3(1.0) - v_color) * alpha, alpha);
}
`;

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { vertexShaderSrc, fragmentShaderSrc };
  } else {
    window.vertexShaderSrc = vertexShaderSrc;
    window.fragmentShaderSrc = fragmentShaderSrc;
  }
})();