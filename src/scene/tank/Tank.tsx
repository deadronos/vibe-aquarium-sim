import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../../config/scene';
import { daylight } from '../daylight';
import { backdropTexture } from '../textures';
import { FeedTarget } from './FeedTarget';
import { FilterPipes } from './FilterPipes';
import { LightFixture } from './LightFixture';
import { TankGlass } from './TankGlass';
import { makeUnderwater } from './underwater';
import { WaterSurface } from './WaterSurface';
import { useDispose } from '../dispose';

const { width: W, height: H, depth: D } = TANK;

export const Tank = () => {
  const backdrop = useMemo(
    () =>
      makeUnderwater(
        new THREE.MeshStandardMaterial({
          color: '#000000',
          emissive: '#ffffff',
          emissiveMap: backdropTexture(),
          roughness: 1,
        })
      ),
    []
  );
  useDispose(backdrop);

  useFrame(() => {
    backdrop.emissiveIntensity = 0.06 + daylight.tankLight * 0.55 + daylight.moonLight * 0.05;
  });

  return (
    <group position={TANK_ORIGIN}>
      {/* Frosted, backlit rear panel. */}
      <mesh position={[0, H / 2, -D / 2 + 0.003]} material={backdrop}>
        <planeGeometry args={[W - 0.002, H]} />
      </mesh>

      <WaterSurface />

      {/* Filter pipes and heater. */}
      <FilterPipes />

      <TankGlass />

      <LightFixture />

      <FeedTarget />
    </group>
  );
};
