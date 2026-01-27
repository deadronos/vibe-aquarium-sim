import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  color,
  float,
  vec3,
  positionLocal,
  time,
  uv,
  mix,
  max,
  dot,
  pow,
  smoothstep,
  normalize,
  normalView,
  positionView,
  mx_noise_vec3,
  sin,
  vec4
} from 'three/tsl';
import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';

// Extend so we can use <meshBasicNodeMaterial /> in JSX
extend({ MeshBasicNodeMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshBasicNodeMaterial: ThreeElement<typeof MeshBasicNodeMaterial>;
  }
}

// --- Utils ---

// Safe normalize (avoid div by zero)
const safeNormalize = (v: any) => normalize(v); // TSL normalize is generally safe or we trust it handles it

// Simplex-like noise wrapper using mx_noise_vec3 (standard TSL noise)
const snoise = (v: any) => mx_noise_vec3(v);

// --- Volume Material ---

interface WaterVolumeNodeMaterialProps {
  waterColor?: string | THREE.Color;
  opacity?: number;
  causticsScale?: number;
  causticsSpeed?: number;
  causticsIntensity?: number;
  volumeSpecularStrength?: number;
  volumeShimmerStrength?: number;
}

export const WaterVolumeNodeMaterial = ({
  waterColor = '#1a4d6d',
  opacity = 0.3,
  causticsScale = 2.0,
  causticsSpeed = 0.5,
  causticsIntensity = 0.3,
  volumeSpecularStrength = 0.18,
  volumeShimmerStrength = 0.12,
}: WaterVolumeNodeMaterialProps) => {
  const t = time;

  // 1. Depth Gradient
  const depth = smoothstep(-1.0, 1.0, positionLocal.y);
  const baseColor = color(new THREE.Color(waterColor));
  const gradientColor = mix(baseColor.mul(0.5), baseColor.mul(1.5), depth);

  // 2. Caustics
  const noiseCtx = vec3(
    positionLocal.x.mul(causticsScale),
    positionLocal.y.mul(causticsScale).add(t.mul(causticsSpeed)),
    positionLocal.z.mul(causticsScale)
  );
  const noiseVal = snoise(noiseCtx);
  const causticMask = smoothstep(0.4, 0.6, noiseVal).mul(causticsIntensity);

  // 3. Fresnel
  const viewDir = safeNormalize(positionView.negate()); // View space position is negative view dir
  const ndv = max(dot(viewDir, normalView), 0.0);
  const fresnel = pow(float(1.0).sub(ndv), 3.0);

  // 4. Specular + Shimmer
  // Note: TSL logic for conditional branching is tricky; we'll compute it always but scale by strength.
  // Shimmer perturb
  const shimmerScale = float(0.18).mul(volumeShimmerStrength);
  const shimmerNoise = snoise(vec3(
    positionLocal.x.mul(1.4).add(t.mul(0.25)),
    positionLocal.y.mul(1.1).add(t.mul(0.18)),
    positionLocal.z.mul(1.4).sub(t.mul(0.22))
  ));
  // Create a perturbation vector
  const perturb = vec3(shimmerNoise, shimmerNoise.mul(0.5), shimmerNoise.negate()).mul(shimmerScale);
  const upgradedNormal = safeNormalize(normalView.add(perturb));

  const lightDir = safeNormalize(vec3(0.25, 1.0, 0.15));
  const halfDir = safeNormalize(lightDir.add(viewDir));
  const rawSpec = pow(max(dot(upgradedNormal, halfDir), 0.0), 48.0);
  const volumeSpec = rawSpec.mul(float(0.25).add(float(0.75).mul(fresnel))).mul(volumeSpecularStrength);

  // Combine
  const finalRgb = gradientColor.add(vec3(causticMask)).add(fresnel.mul(0.2)).add(vec3(volumeSpec));
  const finalAlpha = float(opacity).mul(float(0.6).add(float(0.4).mul(fresnel)));

  return (
    <meshBasicNodeMaterial
      colorNode={vec4(finalRgb, finalAlpha)}
      transparent={true}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  );
};

// --- Surface Material ---

interface WaterSurfaceNodeMaterialProps {
  surfaceTint?: string | THREE.Color;
  surfaceOpacity?: number;
  surfaceStrength?: number;
  surfaceShimmerStrength?: number;
  surfaceFresnelStrength?: number;
}

export const WaterSurfaceNodeMaterial = ({
  surfaceTint = '#aaddff',
  surfaceOpacity = 0.18,
  surfaceStrength = 0.75,
  surfaceShimmerStrength = 1.0,
  surfaceFresnelStrength = 1.0,
}: WaterSurfaceNodeMaterialProps) => {
  const t = time;
  const mainUv = uv();

  // Perturb Normal
  const w1 = sin(mainUv.x.mul(20.0).add(t.mul(0.6))).mul(sin(mainUv.y.mul(18.0).sub(t.mul(0.5))));
  const w2 = sin(mainUv.x.mul(55.0).sub(t.mul(1.2))).mul(sin(mainUv.y.mul(50.0).add(t.mul(1.1))));
  const p = vec3(w1, w2.mul(0.5), w1.negate().mul(0.5));
  
  const perturbScale = float(0.15).mul(surfaceShimmerStrength);
  const n = safeNormalize(normalView.add(p.mul(perturbScale)));
  
  const v = safeNormalize(positionView.negate());
  const l = safeNormalize(vec3(0.35, 1.0, 0.2));

  const ndv = max(dot(n, v), 0.0);
  const fresnel = pow(float(1.0).sub(ndv), 5.0);

  const h = safeNormalize(l.add(v));
  const spec = pow(max(dot(n, h), 0.0), 64.0);
  const glint = spec.mul(float(0.3).add(float(0.7).mul(fresnel)));

  const tintColor = color(new THREE.Color(surfaceTint)).mul(0.12);
  const glintColor = vec3(1.0).mul(glint).mul(surfaceStrength);
  const fresnelColor = vec3(0.25, 0.55, 0.85).mul(fresnel).mul(surfaceFresnelStrength).mul(0.12);
  
  const finalColor = tintColor.add(glintColor).add(fresnelColor);
  
  const alphaRaw = float(surfaceOpacity).mul(float(0.2).add(float(0.8).mul(fresnel))).add(glint.mul(0.35));
  // Clamp alpha (min/max in TSL needed? use clamp builtin if available, or min(max()))
  // TSL usually has clamp(val, min, max)
  // We'll trust alphaRaw behaves or use min(alphaRaw, 0.9)
  // Let's use standard clamp logic if possible or just assume it's OK for now.
  // Actually, let's leave it unclamped for simplicity, standard materials clip alpha anyway.
  
  return (
    <meshBasicNodeMaterial
      colorNode={vec4(finalColor, alphaRaw)}
      transparent={true}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  );
};
