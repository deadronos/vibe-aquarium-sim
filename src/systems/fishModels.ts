import * as THREE from 'three';

// We'll load GLBs from the public folder so authors can drop models there.
const base = import.meta.env.BASE_URL;
export const MODEL_URLS = [
  `${base}Copilot3D-fish.glb`,
  `${base}Copilot3D-fish2.glb`,
  `${base}Copilot3D-fish3.glb`,
] as const;

export type FishModelIndex = 0 | 1 | 2;

const isFishModelIndex = (value: unknown): value is FishModelIndex =>
  value === 0 || value === 1 || value === 2;

/**
 * Resolves an entity's requested visual variant to a model that is currently
 * renderable. Variants are optional during progressive loading, but model 0
 * remains the stable visual fallback.
 */
export function resolveFishModelIndex(
  requested: unknown,
  available: readonly FishModelIndex[]
): FishModelIndex {
  return isFishModelIndex(requested) && available.includes(requested) ? requested : 0;
}

// Exported helper used by the component and unit tests
export function extractModelAssets(scene: THREE.Object3D): {
  geo: THREE.BufferGeometry | null;
  mat: THREE.Material | THREE.Material[] | null;
} {
  let geo: THREE.BufferGeometry | null = null;
  let mat: THREE.Material | THREE.Material[] | null = null;
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      if (!geo) {
        geo = (child as THREE.Mesh).geometry.clone();
        mat = (child as THREE.Mesh).material;
      }
    }
  });
  return { geo, mat };
}
