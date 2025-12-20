import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { world } from '../store';
import type { Entity } from '../store';
import { Vector3 } from 'three';
import { TANK_DIMENSIONS } from '../config/constants';

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
  useFrame((_, delta) => {
    if (!rigidBody.current) return;

    // Handle excitement decay
    if (entity.excitementLevel && entity.excitementLevel > 0) {
      entity.excitementDecay = (entity.excitementDecay || 0) - delta;
      if (entity.excitementDecay <= 0) {
        entity.excitementLevel = 0;
        entity.excitementDecay = 0;
      }
    }

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
    const margin = 0.1; // 10cm margin (fish radius is ~6cm)
    const limitX = TANK_DIMENSIONS.width / 2 - margin;
    const limitY = TANK_DIMENSIONS.height / 2 - margin;
    const limitZ = TANK_DIMENSIONS.depth / 2 - margin;

    let clamped = false;
    let cx = currentPos.x;
    let cy = currentPos.y;
    let cz = currentPos.z;
    let vx = targetVelocity.x;
    let vy = targetVelocity.y;
    let vz = targetVelocity.z;

    if (Math.abs(cx) > limitX) {
      cx = Math.sign(cx) * limitX;
      vx *= -0.5; // Bounce back
      clamped = true;
    }
    if (Math.abs(cy) > limitY) {
      cy = Math.sign(cy) * limitY;
      vy *= -0.5;
      clamped = true;
    }
    if (Math.abs(cz) > limitZ) {
      cz = Math.sign(cz) * limitZ;
      vz *= -0.5;
      clamped = true;
    }

    if (clamped) {
      // 1. Force Hard Reset of Physics Position
      rigidBody.current.setTranslation({ x: cx, y: cy, z: cz }, true);
      // 2. Reflect Velocity (preserve momentum but reverse direction)
      rigidBody.current.setLinvel({ x: vx, y: vy, z: vz }, true);
      // 3. Update targetVelocity for next frame continuity
      targetVelocity.set(vx, vy, vz);
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
