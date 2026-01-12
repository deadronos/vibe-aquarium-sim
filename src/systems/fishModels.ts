import * as THREE from 'three';

// We'll load GLBs from the public folder so authors can drop models there.
export const MODEL_URLS = ['/Copilot3D-fish.glb', '/Copilot3D-fish2.glb', '/Copilot3D-fish3.glb'];

// Exported helper used by the component and unit tests
export function extractModelAssets(scene: THREE.Object3D) {
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
