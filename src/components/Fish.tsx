import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { world } from '../store';
import type { Entity } from '../store';
import { applyQueuedForcesToRigidBody } from '../utils/physicsHelpers';
import { clampPositionToTank } from '../utils/boundaryUtils';

const FIXED_DT = 1 / 60;
const clampOutPosition = { x: 0, y: 0, z: 0 };
const clampOutVelocity = { x: 0, y: 0, z: 0 };

export const Fish = ({ entity }: { entity: Entity }) => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const entityRef = useRef<Entity>(entity);

  useEffect(() => {
    entityRef.current = entity;
  }, [entity]);

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
    const ent = entityRef.current;
    // Lightweight sampling: measure every 10th call per-entity to avoid heavy logging
    try {
      ent.__vibe_dbgCounter = (ent.__vibe_dbgCounter || 0) + 1;
    } catch {
      /* ignore */
    }
    const sampleThis = ((ent.__vibe_dbgCounter ?? 0) % 10) === 0;
    const t0 = sampleThis ? performance.now() : 0;

    const rb = rigidBody.current;
    if (!rb) return;

    // Use pre-existing targetVelocity from entity (initialized by Spawner)
    const targetVelocity = ent.targetVelocity;
    if (!targetVelocity) return;

    const currentPos = rb.translation();
    const currentVel = rb.linvel();
    targetVelocity.set(currentVel.x, currentVel.y, currentVel.z);

    // Apply steering force and external forces
    applyQueuedForcesToRigidBody(targetVelocity, ent, FIXED_DT);

    // Speed boost when excited - apply as a gentle acceleration boost, not raw multiplier
    if (ent.excitementLevel && ent.excitementLevel > 0.1) {
      // Add extra speed in the current direction, capped
      const speedSq = targetVelocity.lengthSq();
      if (speedSq > 0.0001) {
        const speed = Math.sqrt(speedSq);
        const boostAmount = ent.excitementLevel * 0.15; // Gentler boost
        targetVelocity.multiplyScalar((speed + boostAmount) / speed);
      }
    }

    // Clamp final velocity to max speed to prevent escaping
    const maxSpeed = 0.8; // Slightly above boids maxSpeed of 0.4
    const maxSpeedSq = maxSpeed * maxSpeed;
    const finalSpeedSq = targetVelocity.lengthSq();
    if (finalSpeedSq > maxSpeedSq) {
      targetVelocity.multiplyScalar(maxSpeed / Math.sqrt(finalSpeedSq));
    }

    // Set velocity directly (velocity-based approach)
    rb.setLinvel(targetVelocity, true);

    // --- SAFETY NET: Force Fish Inside Tank ---
    // If physics glitch causes tunneling, we intercept it before render
    const clamped = clampPositionToTank(
      currentPos,
      targetVelocity,
      clampOutPosition,
      clampOutVelocity
    );

    if (clamped) {
      // 1. Force Hard Reset of Physics Position
      rb.setTranslation(clampOutPosition, true);
      // 2. Reflect Velocity (preserve momentum but reverse direction)
      rb.setLinvel(clampOutVelocity, true);
      // 3. Update targetVelocity for next frame continuity
      targetVelocity.set(clampOutVelocity.x, clampOutVelocity.y, clampOutVelocity.z);
    }

    // Sync Physics -> ECS
    if (ent.position) {
      const pos = clamped ? clampOutPosition : currentPos;
      ent.position.set(pos.x, pos.y, pos.z);
    }
    if (ent.velocity) {
      const vel = clamped ? clampOutVelocity : targetVelocity;
      ent.velocity.set(vel.x, vel.y, vel.z);
    }

    if (sampleThis) {
      try {
        const t1 = performance.now();
        const dbg = window.__vibe_debug;
        if (dbg) dbg.fishUseFrame.push({ duration: t1 - t0, modelIndex: ent.modelIndex ?? null });
      } catch {
        /* ignore */
      }
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
