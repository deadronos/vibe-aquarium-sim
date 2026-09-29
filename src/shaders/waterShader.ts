import {
  EPS_CONST_GLSL,
  SAFE_NORMALIZE_GLSL,
  SIMPLEX_3D_NOISE_GLSL,
  TONEMAP_COLORSPACE_INCLUDES,
} from './glsl/common';

export const waterVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

${EPS_CONST_GLSL}

${SAFE_NORMALIZE_GLSL}
void main() {
  vUv = uv;
  vPosition = position;
  vNormal = safeNormalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const waterFragmentShader = `
uniform float time;
uniform vec3 waterColor;
uniform float opacity;
uniform float causticsScale;
uniform float causticsSpeed;
uniform float causticsIntensity;
uniform float volumeSpecularStrength;
uniform float volumeShimmerStrength;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

${EPS_CONST_GLSL}

${SAFE_NORMALIZE_GLSL}
${SIMPLEX_3D_NOISE_GLSL}
void main() {
  // Base depth gradient (y is vertical)
  // Assuming tank height around 2.0 (-1 to 1)
  float depth = smoothstep(-1.0, 1.0, vPosition.y);
  vec3 gradientColor = mix(waterColor * 0.5, waterColor * 1.5, depth);

  // Caustics pattern
  float noise = snoise(vec3(vPosition.x * causticsScale, vPosition.y * causticsScale + time * causticsSpeed, vPosition.z * causticsScale));
  float caustics = smoothstep(0.4, 0.6, noise) * causticsIntensity; // Sharpen noise for caustic look

  // Fresnel
  vec3 viewDir = safeNormalize(vViewPosition);
  // Clamp dot product to avoid negative values from floating point errors
  float dotValue = max(dot(viewDir, vNormal), 0.0);
  float fresnel = pow(1.0 - dotValue, 3.0);

  // Optional volume upgrade: subtle specular + shimmer (strengths are 0 when disabled)
  vec3 upgradedNormal = vNormal;
  if (volumeShimmerStrength > 0.0) {
    float shimmer = snoise(vec3(
      vPosition.x * 1.4 + time * 0.25,
      vPosition.y * 1.1 + time * 0.18,
      vPosition.z * 1.4 - time * 0.22
    ));
    upgradedNormal = safeNormalize(vNormal + volumeShimmerStrength * 0.18 * vec3(shimmer, shimmer * 0.5, -shimmer));
  }

  float volumeSpec = 0.0;
  if (volumeSpecularStrength > 0.0) {
    vec3 lightDir = safeNormalize(vec3(0.25, 1.0, 0.15));
    vec3 halfDir = safeNormalize(lightDir + viewDir);
    // Sharper spec helps suggest a “liquid” highlight.
    float rawSpec = pow(max(dot(upgradedNormal, halfDir), 0.0), 48.0);
    volumeSpec = rawSpec * (0.25 + 0.75 * fresnel) * volumeSpecularStrength;
  }

  // Combine
  vec3 finalColor = gradientColor + vec3(caustics) + fresnel * 0.2 + vec3(volumeSpec);

  gl_FragColor = vec4(finalColor, opacity * (0.6 + 0.4 * fresnel));

  // Match three's managed output for built-in and WebGPU node materials:
  // tone mapping then output color space conversion. These chunks resolve to
  // identity while rendering into a linear render target (post-processing).
  ${TONEMAP_COLORSPACE_INCLUDES}
}
`;
