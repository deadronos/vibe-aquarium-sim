import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import type { Entity } from '../store';

export const Food = ({ entity }: { entity: Entity }) => {
    const rigidBody = useRef<RapierRigidBody>(null);

    // Apply initial velocity once
    useEffect(() => {
        if (rigidBody.current && entity.velocity) {
            rigidBody.current.setLinvel(entity.velocity, true);
        }
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
            linearDamping={1.0}
            angularDamping={1.0}
            restitution={0.2}
            mass={0.1}
            gravityScale={1.0}
        >
            <BallCollider args={[0.05]} />
            <mesh castShadow receiveShadow>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshStandardMaterial color="#ffaa00" roughness={0.4} />
            </mesh>
        </RigidBody>
    );
};
