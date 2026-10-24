import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../../config/scene';
import { daylight } from '../daylight';

const { width: W, height: H } = TANK;
const FIXTURE_Y = H + 0.13;

/** Slim LED fixture on legs, with the day and moonlight spots that light the tank. */
export const LightFixture = () => {
  const fixtureGlow = useRef<THREE.MeshBasicMaterial>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const moonSpot = useRef<THREE.SpotLight>(null);

  useLayoutEffect(() => {
    // Spot targets are not in the scene graph, so their (world) matrices are set once by hand.
    for (const light of [spot.current!, moonSpot.current!]) {
      light.target.position.set(TANK_ORIGIN[0], TANK_ORIGIN[1] - 1, TANK_ORIGIN[2]);
      light.target.updateMatrixWorld();
    }
  }, []);

  useFrame(() => {
    const t = daylight.tankLight;
    const m = daylight.moonLight;
    fixtureGlow
      .current!.color.setRGB(0.9 * t + 0.08 * m, 0.95 * t + 0.16 * m, 1 * t + 0.6 * m)
      .multiplyScalar(4);
    spot.current!.intensity = t * 9;
    moonSpot.current!.intensity = m * 1.2;
  });

  return (
    <group position-y={FIXTURE_Y}>
      <mesh castShadow>
        <boxGeometry args={[W - 0.08, 0.014, 0.11]} />
        <meshStandardMaterial color="#141516" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position-y={-0.0075} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W - 0.12, 0.08]} />
        <meshBasicMaterial ref={fixtureGlow} toneMapped={false} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * (W / 2 - 0.05), -0.065, sz * 0.05]}
            rotation-x={sz * 0.6}
          >
            <cylinderGeometry args={[0.003, 0.003, 0.15, 6]} />
            <meshStandardMaterial color="#141516" metalness={0.6} roughness={0.35} />
          </mesh>
        ))
      )}
      <spotLight
        ref={spot}
        position={[0, -0.01, 0]}
        angle={1.05}
        penumbra={0.9}
        distance={1.4}
        decay={1.6}
        color="#eef7ff"
      />
      <spotLight
        ref={moonSpot}
        position={[0, -0.01, 0]}
        angle={1.0}
        penumbra={1}
        distance={1.4}
        decay={1.6}
        color="#4a6dff"
      />
    </group>
  );
};
