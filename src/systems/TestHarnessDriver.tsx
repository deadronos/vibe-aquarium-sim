import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAfterPhysicsStep, useRapier } from '@react-three/rapier';
import { world } from '../store';
import {
  getTestHarness,
  installTestHarness,
  resetTestHarness,
  tickTestHarnessFrame,
} from '../utils/testHarness';

const fishQuery = world.with('isFish', 'position', 'velocity');

// Reused to keep the pin path allocation-free even though it is test-only.
const pinTranslation = { x: 0, y: 0, z: 0 };
const zeroVelocity = { x: 0, y: 0, z: 0 };
const motionPose = { x: 0, y: 0, z: 0 };

const FIXED_DT = 1 / 60;

/**
 * Mounted only under `?testHarness=1`. Pins fish to deterministic poses after
 * Rapier steps so renderer captures are reproducible across backends.
 */
export const TestHarnessDriver = () => {
  const { world: rapierWorld } = useRapier();

  useEffect(() => {
    installTestHarness();
    return () => resetTestHarness();
  }, []);

  useAfterPhysicsStep(() => {
    const harness = getTestHarness();
    if (!harness || !harness.frozen) return;

    const motion = harness.motion;
    const elapsed = motion ? (harness.frame - motion.startFrame) * FIXED_DT : 0;

    const entities = fishQuery.entities;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]!;
      const pose = harness.poses.get(i) ?? entity.position;
      if (!pose) continue;

      if (motion) {
        motionPose.x = pose.x + motion.velocity.x * elapsed;
        motionPose.y = pose.y + motion.velocity.y * elapsed;
        motionPose.z = pose.z + motion.velocity.z * elapsed;
        pinTranslation.x = motionPose.x;
        pinTranslation.y = motionPose.y;
        pinTranslation.z = motionPose.z;
        entity.position?.set(motionPose.x, motionPose.y, motionPose.z);
      } else {
        pinTranslation.x = pose.x;
        pinTranslation.y = pose.y;
        pinTranslation.z = pose.z;
        if (entity.position !== pose) entity.position?.copy(pose);
      }
      entity.velocity?.set(0, 0, 0);

      if (typeof entity.rigidBodyHandle === 'number') {
        const body = rapierWorld.getRigidBody(entity.rigidBodyHandle);
        if (body) {
          body.setTranslation(pinTranslation, true);
          body.setLinvel(zeroVelocity, true);
        }
      }
    }
  });

  useFrame(() => {
    tickTestHarnessFrame();
  });

  return null;
};
