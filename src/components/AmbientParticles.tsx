import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three';

import { useVisualQuality } from '../performance/VisualQualityContext';
import { TANK_DIMENSIONS } from '../config/constants';
import { useQualityStore } from '../performance/qualityStore';

type ParticleUniforms = {
  time: { value: number };
  color: { value: Color };
  opacity: { value: number };
  pointSize: { value: number };
  driftStrength: { value: number };
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const particleVertexShader = /* glsl */ `
  uniform float time;
  uniform float pointSize;
  uniform float driftStrength;

  attribute float seed;

  varying float vSeed;

  void main() {
    vSeed = seed;
    vec3 p = position;

    // Subtle drift, no per-frame CPU buffer updates.
    float t = time * 0.25 + seed * 12.345;
    p.x += (sin(t) * 0.35 + sin(t * 0.73) * 0.2) * driftStrength;
    p.y += (cos(t * 0.91) * 0.35 + sin(t * 0.41) * 0.2) * driftStrength;
    p.z += (sin(t * 0.63) * 0.35 + cos(t * 0.57) * 0.2) * driftStrength;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Perspective-correct point sizing
    // Avoid division-by-zero when mvPosition.z is near 0 (some drivers warn or error)
    float depth = max(-mvPosition.z, 0.001);
    gl_PointSize = pointSize * (300.0 / depth);
  }
`;

const particleFragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float opacity;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(uv, uv);

    // Soft round sprite
    float alpha = smoothstep(1.0, 0.0, r2);
    alpha *= alpha;

    // Tiny per-particle variation
    float twinkle = 0.75 + 0.25 * fract(sin(vSeed * 43758.5453) * 43758.5453);

    gl_FragColor = vec4(color, opacity * alpha * twinkle);
    if (gl_FragColor.a < 0.01) discard;
  }
`;

const createParticlesGeometry = (
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

const AmbientParticlesEnabled = () => {
  const nearTimeUniformRef = useRef<{ value: number } | null>(null);
  const farTimeUniformRef = useRef<{ value: number } | null>(null);

  const particleMultiplier = useQualityStore((s) => s.settings.effectParticleMultiplier);

  // Conservative counts; keep draw calls low (2 Points).
  const nearCount = Math.max(100, Math.floor(220 * particleMultiplier));
  const farCount = Math.max(150, Math.floor(320 * particleMultiplier));

  const nearVolume = useMemo(
    () => ({
      x: TANK_DIMENSIONS.width * 0.95,
      y: TANK_DIMENSIONS.height * 0.9,
      z: TANK_DIMENSIONS.depth * 0.95,
    }),
    []
  );

  const farVolume = useMemo(
    () => ({
      x: TANK_DIMENSIONS.width * 1.6,
      y: TANK_DIMENSIONS.height * 1.4,
      z: TANK_DIMENSIONS.depth * 1.6,
    }),
    []
  );

  const { nearGeometry, farGeometry, nearMaterial, farMaterial } = useMemo(() => {
    const ng = createParticlesGeometry(nearCount, 0x1234abcd, nearVolume);
    const fg = createParticlesGeometry(farCount, 0xdeadbeef, farVolume);

    const nearUniforms: ParticleUniforms = {
      time: { value: 0 },
      color: { value: new Color('#a9c7ff') },
      opacity: { value: 0.12 },
      pointSize: { value: 0.9 },
      driftStrength: { value: 0.04 },
    };

    const farUniforms: ParticleUniforms = {
      time: { value: 0 },
      color: { value: new Color('#7aa5ff') },
      opacity: { value: 0.06 },
      pointSize: { value: 0.7 },
      driftStrength: { value: 0.025 },
    };

    const nm = new ShaderMaterial({
      uniforms: nearUniforms,
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    });

    const fm = new ShaderMaterial({
      uniforms: farUniforms,
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: AdditiveBlending,
    });

    return {
      nearGeometry: ng,
      farGeometry: fg,
      nearMaterial: nm,
      farMaterial: fm,
    };
  }, [farCount, farVolume, nearCount, nearVolume]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (nearTimeUniformRef.current) nearTimeUniformRef.current.value = t;
    if (farTimeUniformRef.current) farTimeUniformRef.current.value = t;
  });

  useEffect(() => {
    return () => {
      nearGeometry.dispose();
      farGeometry.dispose();
      nearMaterial.dispose();
      farMaterial.dispose();
    };
  }, [farGeometry, farMaterial, nearGeometry, nearMaterial]);

  useEffect(() => {
    nearTimeUniformRef.current =
      (nearMaterial.uniforms as unknown as { time?: { value: number } }).time ?? null;
    farTimeUniformRef.current =
      (farMaterial.uniforms as unknown as { time?: { value: number } }).time ?? null;
  }, [farMaterial, nearMaterial]);

  return (
    <group>
      <points geometry={farGeometry} material={farMaterial} frustumCulled={false} />
      <points geometry={nearGeometry} material={nearMaterial} frustumCulled={false} />
    </group>
  );
};

export const AmbientParticles = () => {
  const { ambientParticlesEnabled } = useVisualQuality();
  return <>{ambientParticlesEnabled ? <AmbientParticlesEnabled /> : null}</>;
};
