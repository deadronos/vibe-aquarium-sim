import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { world } from '../store';
import type { Entity } from '../store';
import { integrateForcesToVelocity } from '../utils/physicsHelpers';
import { clampPositionToTank } from '../utils/boundaryUtils';

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

    // Apply steering force and external forces
    integrateForcesToVelocity(targetVelocity, entity, dt);

    // Speed boost when excited - apply as a gentle acceleration boost, not raw multiplier
    if (entity.excitementLevel && entity.excitementLevel > 0.1) {
      // Add extra speed in the current direction, capped
      const currentSpeed = targetVelocity.length();
      if (currentSpeed > 0.01) {
        const boostAmount = entity.excitementLevel * 0.15; // Gentler boost
        targetVelocity.normalize().multiplyScalar(currentSpeed + boostAmount);
      }
    }

    // Clamp final velocity to max speed to prevent escaping
    const maxSpeed = 0.8; // Slightly above boids maxSpeed of 0.4
    if (targetVelocity.length() > maxSpeed) {
      targetVelocity.normalize().multiplyScalar(maxSpeed);
    }

    // Set velocity directly (velocity-based approach)
    rigidBody.current.setLinvel(targetVelocity, true);

    // --- SAFETY NET: Force Fish Inside Tank ---
    // If physics glitch causes tunneling, we intercept it before render
    const currentPos = rigidBody.current.translation();
    const {
      clamped,
      position: newPos,
      velocity: newVel,
    } = clampPositionToTank(currentPos, targetVelocity);

    if (clamped) {
      // 1. Force Hard Reset of Physics Position
      rigidBody.current.setTranslation(newPos, true);
      // 2. Reflect Velocity (preserve momentum but reverse direction)
      rigidBody.current.setLinvel(newVel, true);
      // 3. Update targetVelocity for next frame continuity
      targetVelocity.set(newVel.x, newVel.y, newVel.z);
    }

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
        mass={0.05} // 50 grams (small fish)
        ccd={true}
      >
        <BallCollider args={[0.06]} />
      </RigidBody>
    </group>
  );
};
