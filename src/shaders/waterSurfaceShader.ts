export const waterSurfaceVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

vec3 safeNormalize(vec3 v) {
  return v * inversesqrt(max(dot(v, v), 1e-12));
}

void main() {
  vUv = uv;
  vNormal = safeNormalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDir = safeNormalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const waterSurfaceFragmentShader = `
uniform float time;
uniform vec3 surfaceTint;
uniform float surfaceOpacity;
uniform float surfaceStrength;
uniform float surfaceShimmerStrength;
uniform float surfaceFresnelStrength;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

vec3 safeNormalize(vec3 v) {
  return v * inversesqrt(max(dot(v, v), 1e-12));
}

vec3 perturbNormal(vec3 n) {
  // Small, cheap wave-like perturbation for glints (no textures).
  float w1 = sin(vUv.x * 20.0 + time * 0.6) * sin(vUv.y * 18.0 - time * 0.5);
  float w2 = sin(vUv.x * 55.0 - time * 1.2) * sin(vUv.y * 50.0 + time * 1.1);
  vec3 p = vec3(w1, 0.5 * w2, -0.5 * w1);
  return safeNormalize(n + surfaceShimmerStrength * 0.15 * p);
}

void main() {
  vec3 n = perturbNormal(vNormal);
  vec3 v = safeNormalize(vViewDir);
  vec3 l = safeNormalize(vec3(0.35, 1.0, 0.2));

  float ndv = max(dot(n, v), 0.0);
  float fresnel = pow(1.0 - ndv, 5.0);

  vec3 h = safeNormalize(l + v);
  float spec = pow(max(dot(n, h), 0.0), 64.0);
  float glint = spec * (0.3 + 0.7 * fresnel);

  vec3 color = surfaceTint * 0.12;
  color += vec3(1.0) * glint * surfaceStrength;
  color += vec3(0.25, 0.55, 0.85) * fresnel * surfaceFresnelStrength * 0.12;

  float alpha = surfaceOpacity * (0.2 + 0.8 * fresnel) + glint * 0.35;
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.9));
}
`;
