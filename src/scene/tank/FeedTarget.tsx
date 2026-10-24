import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../../config/scene';
import { simulation } from '../fish/simulation';

const { width: W, depth: D, waterLevel: WL } = TANK;

/** Click target covering the water: clicking sprinkles food above that spot. */
export const FeedTarget = () => {
  const onFeed = (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > 6) return; // a drag, not a click
    event.stopPropagation();
    const local = event.point.clone().sub(new THREE.Vector3(...TANK_ORIGIN));
    simulation.food.sprinkle(local.x, local.z);
  };

  return (
    <mesh
      position={[0, WL / 2, 0]}
      onClick={onFeed}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <boxGeometry args={[W, WL, D]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
};
