import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { world } from '../store';
import type { Entity } from '../store';
import { Vector3 } from 'three';

const tempVec = new Vector3();

export const Fish = ({ entity }: { entity: Entity }) => {
  const rigidBody = useRef<RapierRigidBody>(null);

  useEffect(() => {
    return () => {
      if (entity.rigidBodyHandle) {
        world.removeComponent(entity, 'rigidBodyHandle');
      }
    };
  }, [entity]);

  // Cache the rigid body handle once the ref is available
  useEffect(() => {
    if (rigidBody.current && !entity.rigidBodyHandle) {
      world.addComponent(entity, 'rigidBodyHandle', rigidBody.current.handle);
    }
  }, [entity]);

  // Physics interactions and visuals in render loop
  // useFrame runs after the automatic physics step, making it safe to read/write
  useFrame(() => {
    if (!rigidBody.current) return;

    // Use pre-existing targetVelocity from entity (initialized by Spawner)
    const targetVelocity = entity.targetVelocity;
    if (!targetVelocity) return;

    const dt = 1 / 60;
    const currentVel = rigidBody.current.linvel();
    targetVelocity.set(currentVel.x, currentVel.y, currentVel.z);

    // Apply steering force
    if (entity.steeringForce && entity.steeringForce.lengthSq() > 1e-6) {
      tempVec.copy(entity.steeringForce).multiplyScalar(dt);
      targetVelocity.add(tempVec);
    }

    // Apply external force (drag, water current, etc.)
    if (entity.externalForce && entity.externalForce.lengthSq() > 1e-6) {
      tempVec.copy(entity.externalForce).multiplyScalar(dt);
      targetVelocity.add(tempVec);
      entity.externalForce.set(0, 0, 0);
    }

    // Set velocity directly (velocity-based approach)
    rigidBody.current.setLinvel(targetVelocity, true);

    // Sync Physics -> ECS
    const pos = rigidBody.current.translation();
    const vel = rigidBody.current.linvel();
    if (pos && vel) {
      entity.position?.set(pos.x, pos.y, pos.z);
      entity.velocity?.set(vel.x, vel.y, vel.z);
    }
  });

  return (
    <group>
      {/* Physics Body (Invisible) */}
      <RigidBody
        ref={rigidBody}
        position={entity.position}
        colliders={false}
        enabledRotations={[false, false, false]}
        linearDamping={0.5}
        gravityScale={0}
        mass={1}
        ccd={false}
      >
        <BallCollider args={[0.06]} />
      </RigidBody>
    </group>
  );
};
