import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { TANK } from '../../config/scene';
import { algaeLevel } from '../../sim/care';
import { useAquarium } from '../../state/store';
import { useDispose } from '../dispose';
import { algaeTexture } from '../textures';
import { makeUnderwater } from './underwater';

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

/** Algae level to film opacity; the texture's own alpha keeps the clear patches clear. */
const ALGAE_OPACITY = 1.6;

const algaeMaterial = () =>
  makeUnderwater(
    new THREE.MeshStandardMaterial({
      map: algaeTexture(),
      roughness: 0.9,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    { key: 'algae' }
  );

/** Algae film on the inside of the front and side panes; it fades out when the glass is wiped. */
const AlgaeFilm = () => {
  const material = useMemo(() => algaeMaterial(), []);
  useDispose(material);
  useFrame((_, delta) => {
    const { care, careNow } = useAquarium.getState();
    material.opacity = THREE.MathUtils.damp(
      material.opacity,
      algaeLevel(care, careNow) * ALGAE_OPACITY,
      1.5,
      delta
    );
    material.visible = material.opacity > 0.005;
  });
  const inset = G + 0.001;
  const height = WL - 0.004;
  return (
    <group position-y={height / 2}>
      <mesh position-z={D / 2 - inset} material={material} renderOrder={9}>
        <planeGeometry args={[W - inset * 2, height]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position-x={side * (W / 2 - inset)}
          rotation-y={(side * Math.PI) / 2}
          material={material}
          renderOrder={9}
        >
          <planeGeometry args={[D - inset * 2, height]} />
        </mesh>
      ))}
    </group>
  );
};

/** Glass panes, drawn after everything inside. */
export const TankGlass = () => {
  const parts = useMemo(() => ({ glass: glassMaterial(), edge: edgeMaterial() }), []);
  useDispose(parts);
  return (
    <group renderOrder={10}>
      <AlgaeFilm />
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
