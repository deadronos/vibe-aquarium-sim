import { BufferAttribute, BufferGeometry } from 'three';

import { TONEMAP_COLORSPACE_INCLUDES } from './glsl/common';

export const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export const particleVertexShader = /* glsl */ `
  uniform float time;
  uniform float pointSize;
  uniform vec3 tankVolume;
  uniform vec3 driftVelocity;

  attribute float seed;

  varying float vSeed;

  const float EPS = 0.001;

  void main() {
    vSeed = seed;
    
    // Initial position in the box volume
    vec3 p = position;
    
    // 1. Add infinite drift based on time
    vec3 driftOffset = driftVelocity * time;
    
    // 2. Add some per-particle variation to the drift speed so they don't move as a rigid block
    // We use the seed to vary the speed slightly (e.g., 0.8x to 1.2x)
    float speedVar = 0.8 + 0.4 * fract(seed * 123.45);
    p += driftOffset * speedVar;

    // 3. Wrap around the volume (modulo) so they stay in the tank
    // We assume 'p' can go outside, so we wrap it back to [-volume/2, volume/2]
    // GLSL mod(x, y) returns x - y * floor(x/y)
    // We offset by half volume to make the math easier (0..volume), mod, then shift back
    vec3 halfVol = tankVolume * 0.5;
    p = mod(p + halfVol, tankVolume) - halfVol;

    // 4. Add "flutter" or "wobble" (existing logic retained but tuned)
    // This makes the snow look like it's drifting in turbulent water
    float t = time * 0.5 + seed * 50.0;
    p.x += (sin(t) * 0.05 + sin(t * 1.7) * 0.03); 
    p.y += (cos(t * 1.3) * 0.05 + sin(t * 0.8) * 0.03); 
    p.z += (sin(t * 1.1) * 0.05 + cos(t * 1.5) * 0.03);

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Perspective-correct point sizing
    float depth = max(abs(mvPosition.z), EPS);
    gl_PointSize = pointSize * (300.0 / depth);
  }
`;

export const particleFragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float opacity;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(uv, uv);

    if (r2 > 1.0) discard;

    // Soft round sprite
    float alpha = smoothstep(1.0, 0.0, r2);
    
    // vSeed based flicker / twinkle
    // Slower twinkle for snow
    float twinkle = 0.6 + 0.4 * sin(vSeed * 99.0 + color.r); 

    gl_FragColor = vec4(color, opacity * alpha * twinkle);

    // Managed output parity with built-in and WebGPU node materials.
    ${TONEMAP_COLORSPACE_INCLUDES}
  }
`;

export const createParticlesGeometry = (
  count: number,
  seed: number,
  volume: { x: number; y: number; z: number }
) => {
  const rand = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const idx = i * 3;

    // Spread in a box volume.
    positions[idx + 0] = (rand() - 0.5) * volume.x;
    positions[idx + 1] = (rand() - 0.5) * volume.y;
    positions[idx + 2] = (rand() - 0.5) * volume.z;

    seeds[i] = rand();
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new BufferAttribute(seeds, 1));
  return geometry;
};
