import * as THREE from 'three';

export interface SceneDimensions {
  width: number;
  height: number;
  depth: number;
}

/** Dimensions used by the FishRenderSystem mock GLTF scenes (0.2 x 0.1 x 0.05). */
export const FISH_SCENE_DIMENSIONS: SceneDimensions = { width: 0.2, height: 0.1, depth: 0.05 };

const DEFAULT_SCENE_DIMENSIONS: SceneDimensions = { width: 1, height: 1, depth: 1 };

/**
 * Builds a single-mesh mock GLTF scene. Pass a `THREE.Material` to reuse a
 * caller-owned material instance, or a numeric colour to have a standard
 * material constructed for you. Dimensions default to the 1x1x1 box the
 * fish-lighting fixtures use; the FishRenderSystem fixtures pass
 * `FISH_SCENE_DIMENSIONS`.
 */
export function makeScene(
  materialOrColor: THREE.Material | number,
  dimensions: SceneDimensions = DEFAULT_SCENE_DIMENSIONS
): THREE.Object3D {
  const material =
    typeof materialOrColor === 'number'
      ? new THREE.MeshStandardMaterial({ color: materialOrColor })
      : materialOrColor;
  const { width, height, depth } = dimensions;
  const scene = new THREE.Object3D();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material));
  return scene;
}
