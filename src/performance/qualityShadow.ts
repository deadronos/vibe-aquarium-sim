import type * as THREE from 'three';
import type { RendererBackend } from './qualityProfile';

/** Apply a shadow-map size only for WebGL; WebGPU shadows stay at startup size. */
export const applyQualityShadowMap = (
  light: THREE.DirectionalLight | THREE.SpotLight | null | undefined,
  targetSize: number,
  backend: RendererBackend
): void => {
  if (backend === 'webgpu' || !light?.shadow) return;
  const current = light.shadow.mapSize;
  if (current.width === targetSize && current.height === targetSize) return;

  light.shadow.mapSize.set(targetSize, targetSize);
  light.shadow.needsUpdate = true;
};
