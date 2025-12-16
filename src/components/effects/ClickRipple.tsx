import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ClickRippleProps {
    position: THREE.Vector3;
    onComplete: () => void;
}

export const ClickRipple = ({ position, onComplete }: ClickRippleProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);
    const startTime = useRef(Date.now());
    const duration = 600; // ms

    useFrame(() => {
        if (!meshRef.current || !materialRef.current) return;

        const elapsed = Date.now() - startTime.current;
        const progress = elapsed / duration;

        if (progress >= 1) {
            onComplete();
            return;
        }

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        // Scale from 0.1 to 1.5
        const scale = 0.1 + eased * 1.4;
        meshRef.current.scale.set(scale, scale, 1);

        // Fade out
        materialRef.current.opacity = 1 - eased;
    });

    return (
        <mesh ref={meshRef} position={position} rotation={[0, 0, 0]}>
            <ringGeometry args={[0.08, 0.12, 32]} />
            <meshBasicMaterial
                ref={materialRef}
                color="#4fc3f7"
                transparent
                opacity={1}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </mesh>
    );
};
