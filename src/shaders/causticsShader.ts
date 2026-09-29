import {
  EPS_CONST_GLSL,
  SAFE_NORMALIZE_GLSL,
  SIMPLEX_3D_NOISE_GLSL,
  TONEMAP_COLORSPACE_INCLUDES,
} from './glsl/common';

export const causticsVertexShader = `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

${EPS_CONST_GLSL}

${SAFE_NORMALIZE_GLSL}
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  // Approximate world normal; safeNormalize avoids driver edge cases.
  vWorldNormal = safeNormalize(mat3(modelMatrix) * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const causticsFragmentShader = `
uniform float time;
uniform float intensity;
uniform float scale;
uniform float speed;
uniform vec3 color;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

${EPS_CONST_GLSL}

${SIMPLEX_3D_NOISE_GLSL}
void main() {
  // 3D noise in world space so the pattern is continuous across walls/floor.
  vec3 p = vWorldPosition * scale;
  p.y += time * speed;

  // A bit of domain-warping for more organic caustics.
  float warp = snoise(p * 0.35);
  float n = snoise(p + vec3(warp * 0.6));

  // Remap [-1, 1] -> [0, 1]
  float nn = n * 0.5 + 0.5;

  // Caustic lines: sharpen the brighter parts.
  float caustics = smoothstep(0.58, 0.88, nn);
  caustics = caustics * caustics;

  // Subtle reduction on vertical walls.
  float surfaceFade = 0.6 + 0.4 * abs(vWorldNormal.y);

  float strength = caustics * intensity * surfaceFade;
  vec3 outColor = color * strength;

  gl_FragColor = vec4(outColor, strength);

  // Managed output parity with built-in and WebGPU node materials.
  ${TONEMAP_COLORSPACE_INCLUDES}
}
`;
