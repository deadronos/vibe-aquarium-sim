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
const safeNormalize = (v: any) => normalize(v);

// Simplex-like noise wrapper using mx_noise_vec3
const snoise = (v: any) => mx_noise_vec3(v).x;

// --- Volume Material ---

interface WaterVolumeNodeMaterialProps {
  waterColor?: string | THREE.Color;
  opacity?: number;
  causticsScale?: number;
  causticsSpeed?: number;
  causticsIntensity?: number;
  volumeSpecularStrength?: number;
}

export const WaterVolumeNodeMaterial = ({
  waterColor = '#1a4d6d',
  opacity = 0.3,
  causticsScale = 2.0,
  causticsSpeed = 0.5,
  causticsIntensity = 0.3,
  volumeSpecularStrength = 0.18,
}: WaterVolumeNodeMaterialProps) => {
  const t = time;

  // 1. Depth Gradient
  const depth = smoothstep(-1.0, 1.0, positionLocal.y);
  const baseColor = color(new THREE.Color(waterColor));
  const gradientColor = mix(baseColor.mul(0.5), baseColor.mul(1.5), depth);

  // 2. Caustics - simplified: use position with time offset on Y
  const noiseInput = positionLocal.mul(causticsScale);
  // Add time-based vertical offset by manipulating the y component
  const timeOffset = vec3(new THREE.Vector3(0, 1, 0)).mul(t.mul(causticsSpeed));
  const noiseCtx = noiseInput.add(timeOffset);
  const noiseVal = snoise(noiseCtx);
  const causticMask = smoothstep(0.4, 0.6, noiseVal).mul(causticsIntensity);

  // 3. Fresnel
  const viewDir = safeNormalize(positionView.negate());
  const ndv = max(dot(viewDir, normalView), 0.0);
  const fresnel = pow(float(1.0).sub(ndv), 3.0);

  // 4. Specular - simplified without complex shimmer
  // Use base normal for specular
  const lightDir = safeNormalize(vec3(new THREE.Vector3(0.25, 1.0, 0.15)));
  const halfDir = safeNormalize(lightDir.add(viewDir));
  const rawSpec = pow(max(dot(normalView, halfDir), 0.0), 48.0);
  const volumeSpec = rawSpec.mul(float(0.25).add(float(0.75).mul(fresnel))).mul(volumeSpecularStrength);

  // Combine
  const finalRgb = gradientColor
    .add(vec3(causticMask))
    .add(vec3(fresnel.mul(0.2)))
    .add(vec3(volumeSpec));
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

  // Simplified wave effect - single component perturbation
  const waveFreq = 20.0;
  const wave = sin(mainUv.x.mul(waveFreq).add(t.mul(0.6)))
    .mul(sin(mainUv.y.mul(18.0).sub(t.mul(0.5))))
    .mul(0.15)
    .mul(surfaceShimmerStrength);
  
  // Perturb normal with wave in Y direction only (simplified)
  const perturbDirection = vec3(new THREE.Vector3(0, 1, 0)).mul(wave);
  const n = safeNormalize(normalView.add(perturbDirection));
  
  const v = safeNormalize(positionView.negate());
  const l = safeNormalize(vec3(new THREE.Vector3(0.35, 1.0, 0.2)));

  const ndv = max(dot(n, v), 0.0);
  const fresnel = pow(float(1.0).sub(ndv), 5.0);

  const h = safeNormalize(l.add(v));
  const spec = pow(max(dot(n, h), 0.0), 64.0);
  const glint = spec.mul(float(0.3).add(float(0.7).mul(fresnel)));

  const tintColor = color(new THREE.Color(surfaceTint)).mul(0.12);
  const glintColor = vec3(glint).mul(surfaceStrength);
  const fresnelColor = vec3(new THREE.Vector3(0.25, 0.55, 0.85)).mul(fresnel).mul(surfaceFresnelStrength).mul(0.12);
  
  const finalColor = tintColor.add(glintColor).add(fresnelColor);
  
  const alphaRaw = float(surfaceOpacity).mul(float(0.2).add(float(0.8).mul(fresnel))).add(glint.mul(0.35));
  
  return (
    <meshBasicNodeMaterial
      colorNode={vec4(finalColor, alphaRaw)}
      transparent={true}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  );
};
