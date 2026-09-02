import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  RigidBody,
  BallCollider,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
} from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { world } from '../store';
import type { Entity } from '../store';
import { applyFishPhysicsStep, syncFishPhysicsState } from './fishPhysicsStep';

const FIXED_DT = 1 / 60;

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

  // Apply controls immediately before Rapier advances its fixed-step world.
  // This keeps force consumption independent of display-frame frequency.
  useBeforePhysicsStep(() => {
    const rb = rigidBody.current;
    if (!rb) return;

    applyFishPhysicsStep(rb, entityRef.current, FIXED_DT);
  });

  // Mirror post-step physics state and apply the tank safety net before any
  // render frame can observe a tunneled fish.
  useAfterPhysicsStep(() => {
    const rb = rigidBody.current;
    if (!rb) return;

    syncFishPhysicsState(rb, entityRef.current);
  });

  // Render loop records optional diagnostics only. Physics remains the source
  // of truth and no Rapier state is read or written at display-frame rate.
  useFrame(() => {
    const ent = entityRef.current;
    // Debug sampling: gate entirely behind window.__vibe_debug to avoid
    // per-frame overhead (counter, modulo, performance.now) in production.
    const dbg = window.__vibe_debug;
    let sampleThis = false;
    if (dbg) {
      ent.__vibe_dbgCounter = (ent.__vibe_dbgCounter || 0) + 1;
      sampleThis = ent.__vibe_dbgCounter % 10 === 0;
    }
    const t0 = sampleThis ? performance.now() : 0;

    if (sampleThis && dbg) {
      try {
        dbg.fishUseFrame.push({
          duration: performance.now() - t0,
          modelIndex: ent.modelIndex ?? null,
        });
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
