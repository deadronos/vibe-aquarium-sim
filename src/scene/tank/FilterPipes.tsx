import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { TANK } from '../../config/scene';
import { makeUnderwater } from './underwater';

const { height: H, depth: D, waterLevel: WL } = TANK;

const pipe = (points: [number, number, number][], radius: number) =>
  new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      'catmullrom',
      0.1
    ),
    48,
    radius,
    12
  );

/** Filter intake and outflow pipes and the heater with its glowing indicator. */
export const FilterPipes = () => {
  const heaterGlow = useRef<THREE.MeshBasicMaterial>(null);

  const parts = useMemo(() => {
    const pipeGlass = makeUnderwater(
      new THREE.MeshPhysicalMaterial({
        color: '#cfe9e2',
        roughness: 0.08,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
      { key: 'pipe' }
    );
    const intake = pipe(
      [
        [0.5, 0.12, -D / 2 + 0.035],
        [0.5, H - 0.02, -D / 2 + 0.035],
        [0.5, H + 0.025, -D / 2 + 0.01],
        [0.5, H + 0.02, -D / 2 - 0.03],
        [0.5, H - 0.12, -D / 2 - 0.035],
      ],
      0.008
    );
    const outflow = pipe(
      [
        [-0.5, H - 0.12, -D / 2 - 0.035],
        [-0.5, H + 0.02, -D / 2 - 0.03],
        [-0.5, H + 0.025, -D / 2 + 0.01],
        [-0.5, WL - 0.02, -D / 2 + 0.035],
        [-0.5, WL - 0.04, -D / 2 + 0.07],
      ],
      0.008
    );
    return { pipeGlass, intake, outflow };
  }, []);

  useFrame(() => {
    heaterGlow
      .current!.color.setRGB(1, 0.35, 0.1)
      .multiplyScalar(1.5 + Math.sin(performance.now() * 0.0004) * 0.5);
  });

  return (
    <>
      <mesh geometry={parts.intake} material={parts.pipeGlass} renderOrder={6} />
      <mesh geometry={parts.outflow} material={parts.pipeGlass} renderOrder={6} />
      <mesh position={[0.5, 0.1, -D / 2 + 0.035]} material={parts.pipeGlass} renderOrder={6}>
        <cylinderGeometry args={[0.013, 0.013, 0.07, 16]} />
      </mesh>
      <group position={[-0.43, 0.2, -D / 2 + 0.03]} rotation-z={0.5}>
        <mesh material={parts.pipeGlass} renderOrder={6}>
          <cylinderGeometry args={[0.011, 0.011, 0.2, 14]} />
        </mesh>
        <mesh position-y={-0.08}>
          <cylinderGeometry args={[0.004, 0.004, 0.02, 8]} />
          <meshBasicMaterial ref={heaterGlow} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
};
