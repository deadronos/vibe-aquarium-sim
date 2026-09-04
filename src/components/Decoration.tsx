import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import type { Entity } from '../store';
import type { DecorationType } from '../domain/types';
import { AQUARIUM_PALETTE, DECORATION_MATERIAL } from '../config/artDirection';

interface DecorationProps {
  entity: Entity;
}

const sharedDecorationMaterial = {
  roughness: DECORATION_MATERIAL.roughness,
  metalness: DECORATION_MATERIAL.metalness,
  flatShading: DECORATION_MATERIAL.flatShading,
};

// Seaweed - a compact cluster of faceted blades with a slow current sway.
const Seaweed: React.FC<{ blades?: { height: number; offset: number; phase: number }[] }> = ({
  blades: propBlades,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Use blades from entity props when available, otherwise sensible defaults
  const blades = propBlades ?? [
    { height: 0.4, offset: 0, phase: 0 },
    { height: 0.3, offset: 0.05, phase: 1 },
    { height: 0.35, offset: -0.04, phase: 2 },
  ];

  useFrame((state: any) => {
    if (!groupRef.current) return;
    const time = state.clock?.elapsedTime || performance.now() / 1000;

    // Subtle swaying animation
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const blade = blades[i];
        child.rotation.z = Math.sin(time * 0.8 + blade.phase) * 0.15;
        child.rotation.x = Math.sin(time * 0.5 + blade.phase * 0.5) * 0.08;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {blades.map((blade, i) => (
        <mesh key={i} position={[blade.offset, blade.height / 2, 0]} scale={[1, 1, 0.65]}>
          <capsuleGeometry args={[0.018, blade.height * 0.82, 4, 4]} />
          <meshStandardMaterial color={AQUARIUM_PALETTE.kelp} {...sharedDecorationMaterial} />
        </mesh>
      ))}
    </group>
  );
};

// Coral - a low-poly branching accent with a darker base so it feels rooted.
const Coral: React.FC<{ color?: string }> = ({ color: propColor }) => {
  const color = propColor ?? AQUARIUM_PALETTE.coral;

  return (
    <group>
      <mesh position={[0, 0.045, 0]} scale={[1.25, 0.45, 0.9]}>
        <dodecahedronGeometry args={[0.09, 0]} />
        <meshStandardMaterial color={AQUARIUM_PALETTE.rock} {...sharedDecorationMaterial} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.035, 0.06, 0.22, 6]} />
        <meshStandardMaterial color={color} {...sharedDecorationMaterial} />
      </mesh>
      <mesh position={[0.055, 0.25, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.016, 0.03, 0.14, 5]} />
        <meshStandardMaterial color={color} {...sharedDecorationMaterial} />
      </mesh>
      <mesh position={[-0.04, 0.18, 0.03]} rotation={[0.3, 0, 0.4]}>
        <cylinderGeometry args={[0.014, 0.026, 0.12, 5]} />
        <meshStandardMaterial color={color} {...sharedDecorationMaterial} />
      </mesh>
      <mesh position={[0, 0.22, -0.04]} rotation={[-0.4, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.022, 0.1, 5]} />
        <meshStandardMaterial color={color} {...sharedDecorationMaterial} />
      </mesh>
    </group>
  );
};

// Rock - a flattened faceted stone that anchors each cluster.
const Rock: React.FC<{ scale?: number; color?: string | THREE.Color }> = ({
  scale: propScale,
  color: propColor,
}) => {
  const scale = propScale ?? 1;
  const color = propColor ?? AQUARIUM_PALETTE.rock;

  return (
    <mesh position={[0, 0.055 * scale, 0]} scale={[scale * 1.15, scale * 0.72, scale]}>
      <icosahedronGeometry args={[0.1, 1]} />
      <meshStandardMaterial color={color} {...sharedDecorationMaterial} />
    </mesh>
  );
};

const decorationComponents: Record<DecorationType, React.FC> = {
  seaweed: Seaweed,
  coral: Coral,
  rock: Rock,
};

export const Decoration = ({ entity }: DecorationProps) => {
  const type = entity.decorationType || 'rock';
  const DecorationComponent = decorationComponents[type];
  const props = (entity.decorationProps ?? {}) as Record<string, unknown>;

  return (
    <RigidBody type="fixed" position={entity.position} colliders={false}>
      <CuboidCollider args={[0.1, 0.15, 0.1]} position={[0, 0.15, 0]} />
      <DecorationComponent {...props} />
    </RigidBody>
  );
};
