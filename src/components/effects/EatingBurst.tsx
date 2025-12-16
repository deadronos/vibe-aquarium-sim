import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EatingBurstProps {
    position: THREE.Vector3;
    onComplete: () => void;
}

const PARTICLE_COUNT = 10;

export const EatingBurst = ({ position, onComplete }: EatingBurstProps) => {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const startTime = useRef(Date.now());
    const duration = 350; // ms

    // Initialize particle velocities - scaled for small food
    const particles = useMemo(() => {
        return Array.from({ length: PARTICLE_COUNT }, () => ({
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(0.2 + Math.random() * 0.3),
            size: 0.005 + Math.random() * 0.004, // 5-9mm particles
        }));
    }, []);

    useFrame(() => {
        if (!instancedMeshRef.current || !materialRef.current) return;

        const elapsed = Date.now() - startTime.current;
        const progress = elapsed / duration;

        if (progress >= 1) {
            onComplete();
            return;
        }

        // Ease out
        const eased = 1 - Math.pow(1 - progress, 2);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const particle = particles[i];

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
        <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
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
