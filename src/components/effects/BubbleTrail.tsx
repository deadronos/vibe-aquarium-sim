import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BubbleTrailProps {
    parentPosition: THREE.Vector3;
}

const BUBBLE_COUNT = 8;

export const BubbleTrail = ({ parentPosition }: BubbleTrailProps) => {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Initialize bubble states - scaled for small food pellets
    const bubbles = useMemo(() => {
        return Array.from({ length: BUBBLE_COUNT }, () => ({
            offset: new THREE.Vector3(
                (Math.random() - 0.5) * 0.04,
                Math.random() * 0.03,
                (Math.random() - 0.5) * 0.04
            ),
            speed: 0.15 + Math.random() * 0.2,
            phase: Math.random() * Math.PI * 2,
            size: 0.004 + Math.random() * 0.006, // 4-10mm bubbles
            wobble: 0.01 + Math.random() * 0.015,
        }));
    }, []);

    useFrame((state) => {
        if (!instancedMeshRef.current) return;
        const time = state.clock.elapsedTime;

        for (let i = 0; i < BUBBLE_COUNT; i++) {
            const bubble = bubbles[i];

            // Position relative to parent with upward drift and wobble
            const yOffset = ((time * bubble.speed + bubble.phase) % 0.5);
            const xWobble = Math.sin(time * 3 + bubble.phase) * bubble.wobble;
            const zWobble = Math.cos(time * 2 + bubble.phase) * bubble.wobble;

            dummy.position.set(
                parentPosition.x + bubble.offset.x + xWobble,
                parentPosition.y + yOffset,
                parentPosition.z + bubble.offset.z + zWobble
            );

            // Fade out as bubbles rise
            const scale = bubble.size * (1 - yOffset * 1.5);
            dummy.scale.setScalar(Math.max(0, scale));

            dummy.updateMatrix();
            instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
        }

        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, BUBBLE_COUNT]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial
                color="#aaeeff"
                emissive="#44bbff"
                emissiveIntensity={0.5}
                transparent
                opacity={0.8}
                depthWrite={false}
            />
        </instancedMesh>
    );
};
