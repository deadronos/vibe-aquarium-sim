import { useMemo } from 'react';
import * as THREE from 'three';
import { TANK } from '../../config/scene';
import { useDispose } from '../dispose';

const { width: W, height: H, depth: D, glass: G, waterLevel: WL } = TANK;

const glassMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: '#eef7f4',
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    envMapIntensity: 1.6,
    specularIntensity: 1,
  });

const edgeMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: '#7fbfa8',
    roughness: 0.1,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });

/** Glass panes, drawn after everything inside. */
export const TankGlass = () => {
  const parts = useMemo(() => ({ glass: glassMaterial(), edge: edgeMaterial() }), []);
  useDispose(parts);
  return (
    <group renderOrder={10}>
      <mesh position={[0, H / 2 - G / 2, D / 2 - G / 2]} material={parts.glass} renderOrder={10}>
        <boxGeometry args={[W, H + G, G]} />
      </mesh>
      <mesh position={[0, H / 2 - G / 2, -D / 2 + G / 2]} material={parts.glass} renderOrder={10}>
        <boxGeometry args={[W, H + G, G]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[(side * (W - G)) / 2, H / 2 - G / 2, 0]}
          material={parts.glass}
          renderOrder={10}
        >
          <boxGeometry args={[G, H + G, D - G * 2]} />
        </mesh>
      ))}
      <mesh position={[0, -G / 2, 0]} material={parts.glass} renderOrder={10}>
        <boxGeometry args={[W, G, D]} />
      </mesh>
      {/* Glass edges catch the light and read green, like real float glass. */}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx! * (W / 2 - 0.0015), H / 2 - G / 2, sz! * (D / 2 - 0.0015)]}
          material={parts.edge}
          renderOrder={11}
        >
          <boxGeometry args={[0.003, H + G, 0.003]} />
        </mesh>
      ))}
      {[-1, 1].map((sz) => (
        <mesh
          key={`top${sz}`}
          position={[0, H, sz * (D / 2 - G / 2)]}
          material={parts.edge}
          renderOrder={11}
        >
          <boxGeometry args={[W, 0.002, G]} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh
          key={`side${sx}`}
          position={[sx * (W / 2 - G / 2), H, 0]}
          material={parts.edge}
          renderOrder={11}
        >
          <boxGeometry args={[G, 0.002, D]} />
        </mesh>
      ))}
      {/* Meniscus: the waterline catches a thin bright line on the front glass. */}
      <mesh position={[0, WL, D / 2 - G - 0.0005]} renderOrder={11}>
        <planeGeometry args={[W - G * 2, 0.0025]} />
        <meshBasicMaterial color="#d9f1ee" transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  );
};
