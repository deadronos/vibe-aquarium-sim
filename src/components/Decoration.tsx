import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import type { Entity, DecorationType } from '../store';

interface DecorationProps {
    entity: Entity;
}

// Seaweed - tall wavy plant
const Seaweed: React.FC<{ blades?: { height: number; offset: number; phase: number }[] }> = ({ blades: propBlades }) => {
    const groupRef = useRef<THREE.Group>(null);

    // Use blades from entity props when available, otherwise sensible defaults
    const blades = propBlades ?? [
        { height: 0.4, offset: 0, phase: 0 },
        { height: 0.3, offset: 0.05, phase: 1 },
        { height: 0.35, offset: -0.04, phase: 2 },
    ];

    useFrame((state) => {
        if (!groupRef.current) return;
        const time = state.clock.elapsedTime;

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
                <mesh key={i} position={[blade.offset, blade.height / 2, 0]}>
                    <boxGeometry args={[0.03, blade.height, 0.02]} />
                    <meshStandardMaterial
                        color="#2d8a4e"
                        roughness={0.8}
                        emissive="#1a5c30"
                        emissiveIntensity={0.1}
                    />
                </mesh>
            ))}
        </group>
    );
};

// Coral - branching structure
const Coral: React.FC<{ color?: string }> = ({ color: propColor }) => {
    const color = propColor ?? '#ff6b6b';

    return (
        <group>
            {/* Main trunk */}
            <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.04, 0.06, 0.2, 8]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            {/* Branches */}
            <mesh position={[0.05, 0.2, 0]} rotation={[0, 0, -0.5]}>
                <cylinderGeometry args={[0.02, 0.03, 0.12, 6]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[-0.04, 0.18, 0.03]} rotation={[0.3, 0, 0.4]}>
                <cylinderGeometry args={[0.02, 0.03, 0.1, 6]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.22, -0.04]} rotation={[-0.4, 0, 0]}>
                <cylinderGeometry args={[0.015, 0.025, 0.08, 6]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
        </group>
    );
};

// Rock - irregular stone
const Rock: React.FC<{ scale?: number; color?: THREE.Color }> = ({ scale: propScale, color: propColor }) => {
    const scale = propScale ?? 1;
    const color = propColor ?? new THREE.Color(0.4, 0.38, 0.36);

    return (
        <mesh position={[0, 0.06 * scale, 0]} scale={scale}>
            <dodecahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial
                color={color}
                roughness={0.9}
                flatShading
            />
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
        <RigidBody
            type="fixed"
            position={entity.position}
            colliders={false}
        >
            <CuboidCollider args={[0.1, 0.15, 0.1]} position={[0, 0.15, 0]} />
            <DecorationComponent {...props} />
        </RigidBody>
    );
};
