import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EatingBurstProps {
    position: THREE.Vector3;
    onComplete: () => void;
    particles?: Array<{ velocity: THREE.Vector3; size: number }>;
}

export const EatingBurst = ({ position, onComplete, particles = [] }: EatingBurstProps) => {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const startTime = useRef<number | null>(null);
    const duration = 350; // ms
    const particleCount = particles.length || 10; // Use actual particle count

    useEffect(() => {
        startTime.current = Date.now();
    }, []);
    useFrame(() => {
        if (!instancedMeshRef.current || !materialRef.current || startTime.current === null) return;

        const elapsed = Date.now() - startTime.current;
        const progress = elapsed / duration;

        if (progress >= 1) {
            onComplete();
            return;
        }

        // Ease out
        const eased = 1 - Math.pow(1 - progress, 2);

        for (let i = 0; i < particleCount; i++) {
            const particle = particles[i];
            if (!particle) continue;

            dummy.position.set(
                position.x + particle.velocity.x * eased * 0.15,
                position.y + particle.velocity.y * eased * 0.15,
                position.z + particle.velocity.z * eased * 0.15
            );

            // Shrink as they move
            const scale = particle.size * (1 - eased * 0.8);
            dummy.scale.setScalar(scale);

            dummy.updateMatrix();
            instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
        }

        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        materialRef.current.opacity = 1 - eased;
    });

    return (
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particleCount]}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial
                ref={materialRef}
                color="#ffcc00"
                transparent
                opacity={1}
                depthWrite={false}
            />
        </instancedMesh>
    );
};
