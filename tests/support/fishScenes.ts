import * as THREE from 'three';

/**
 * Builds the single-mesh mock GLTF scene shared by the fish render tests.
 * The colour becomes the scene's standard material colour.
 */
export function makeScene(color: number): THREE.Object3D {
  const scene = new THREE.Object3D();
  scene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.1, 0.05),
      new THREE.MeshStandardMaterial({ color })
    )
  );
  return scene;
}
