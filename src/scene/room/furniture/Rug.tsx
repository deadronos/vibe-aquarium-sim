import { useMemo } from 'react';
import * as THREE from 'three';
import { rugTexture } from '../../textures';

export const Rug = () => {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 1 }),
    []
  );
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0.05, 0.004, 0.55]}
      material={material}
      receiveShadow
    >
      <planeGeometry args={[2.9, 2]} />
    </mesh>
  );
};
