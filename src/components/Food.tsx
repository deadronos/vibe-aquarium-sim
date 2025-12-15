import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import type { Entity } from '../store';

export const Food = ({ entity }: { entity: Entity }) => {
    const rigidBody = useRef<RapierRigidBody>(null);

    // Clean up when unmounting
    useEffect(() => {
        return () => {
            // If we needed to remove any specific components, we would do it here.
            // But typically ECS cleanup happens at the system/spawn level or when the entity is removed.
        };
    }, []);

    // Sync physics back to ECS
    useFrame(() => {
        if (!rigidBody.current || !entity.position) return;

        const pos = rigidBody.current.translation();
        if (pos) {
            entity.position.set(pos.x, pos.y, pos.z);
        }
    });

    return (
        <RigidBody
            ref={rigidBody}
            position={entity.position}
            colliders={false} // Custom collider
            linearDamping={2.0} // High drag in water
            angularDamping={1.0}
            restitution={0.2}
            mass={0.1}
        >
            <BallCollider args={[0.05]} />
            <mesh castShadow receiveShadow>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshStandardMaterial color="#ffaa00" roughness={0.4} />
            </mesh>
        </RigidBody>
    );
};
