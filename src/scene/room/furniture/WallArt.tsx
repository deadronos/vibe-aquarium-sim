import { useMemo } from 'react';
import * as THREE from 'three';
import { BACK_WALL_Z, TANK, TANK_ORIGIN } from '../../../config/scene';
import { artTexture } from '../../textures';
import { useDispose } from '../../dispose';

export const WallArt = () => {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: artTexture(), roughness: 0.85 }),
    []
  );
  useDispose(material);
  const centerY = TANK_ORIGIN[1] + TANK.height + 0.68;
  return (
    <group position={[0, centerY, BACK_WALL_Z + 0.02]}>
      <mesh castShadow>
        <boxGeometry args={[0.66, 0.8, 0.025]} />
        <meshStandardMaterial color="#1c1a18" roughness={0.6} />
      </mesh>
      <mesh position-z={0.0135} material={material}>
        <planeGeometry args={[0.6, 0.74]} />
      </mesh>
    </group>
  );
};
