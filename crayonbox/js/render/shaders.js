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
  // ─── World-space coordinate sampling via gl_FragCoord ───
  // Locks the paper grain to the canvas coordinate space so wax catches naturally on paper peaks
  vec2 screenTexCoord = gl_FragCoord.xy / u_resolution;
  float paperHeight = texture(u_paperHeightmap, screenTexCoord * 3.0).r;
  float waxNoise = texture(u_waxGrain, screenTexCoord * 6.0).r;

  // ─── Wax coverage ───
  // Higher pressure = more wax deposited into valleys and peaks alike
  float targetCoverage = v_pressure * 0.75 + 0.25;
  float toothMask = smoothstep(1.0 - targetCoverage, 1.0 - targetCoverage + 0.35, paperHeight * 0.7 + waxNoise * 0.3);

  // ─── Edge falloff (rounded crayon tip) ───
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  float edgeFalloff = smoothstep(0.5, 0.2, dist);

  // ─── Final Alpha ───
  float alpha = clamp(toothMask * edgeFalloff * (0.7 + v_pressure * 0.3), 0.0, 1.0);

  // Output with pre-multiplied subtractive wax color
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