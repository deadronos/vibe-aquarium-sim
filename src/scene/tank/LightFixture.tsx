import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { TANK, TANK_ORIGIN } from '../../config/scene';
import { daylight } from '../daylight';

const { width: W, height: H } = TANK;
const FIXTURE_Y = H + 0.13;

// One spot plays both the white day LEDs and the blue moonlight, so every lit fragment shades
// one tank light instead of two (the moon spot used to run at zero all day). Light adds linearly,
// so mixing the two colours by their intensities matches the two spots; the cone eases too.
const DAY = { color: new THREE.Color('#eef7ff'), intensity: 9, angle: 1.05, penumbra: 0.9 };
const MOON = { color: new THREE.Color('#4a6dff'), intensity: 1.2, angle: 1.0, penumbra: 1 };

/** Slim LED fixture on legs, with the spot that lights the tank by day and by moonlight. */
export const LightFixture = () => {
  const fixtureGlow = useRef<THREE.MeshBasicMaterial>(null);
  const spot = useRef<THREE.SpotLight>(null);

  useLayoutEffect(() => {
    // The spot target is not in the scene graph, so its (world) matrix is set once by hand.
    const { target } = spot.current!;
    target.position.set(TANK_ORIGIN[0], TANK_ORIGIN[1] - 1, TANK_ORIGIN[2]);
    target.updateMatrixWorld();
  }, []);

  useFrame(() => {
    const t = daylight.tankLight;
    const m = daylight.moonLight;
    fixtureGlow
      .current!.color.setRGB(0.9 * t + 0.08 * m, 0.95 * t + 0.16 * m, 1 * t + 0.6 * m)
      .multiplyScalar(4);
    const light = spot.current!;
    const day = t * DAY.intensity;
    const moon = m * MOON.intensity;
    light.intensity = day + moon;
    const mix = light.intensity > 0 ? moon / light.intensity : 0;
    light.color.lerpColors(DAY.color, MOON.color, mix);
    light.angle = DAY.angle + (MOON.angle - DAY.angle) * mix;
    light.penumbra = DAY.penumbra + (MOON.penumbra - DAY.penumbra) * mix;
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
      <spotLight ref={spot} position={[0, -0.01, 0]} distance={1.4} decay={1.6} />
    </group>
  );
};
