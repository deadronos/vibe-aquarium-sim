import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { world } from '../store';
import { computeDragForce } from '../utils/physicsHelpers';

const tempDragForce = new Vector3();

// WaterResistanceSystem computes drag for entities and queues it on the ECS `externalForce`
// (DO NOT call Rapier APIs from systems; components must apply queued forces).
export const WaterResistanceSystem = () => {
  useFrame(() => {
    // Iterate over all entities with velocity and rigidBody
    // Note: 'isFish' is used to filter, but any entity with velocity/rigidBody might be subject to drag.
    // However, the design specifies 'isFish'.
    for (const entity of world.with('isFish', 'velocity', 'externalForce')) {
      const { velocity, externalForce } = entity;

      // Compute drag and queue it on the entity; the component owning the RigidBody
      // will apply queued forces at a safe point to avoid WASM re-entrancy.
      if (!computeDragForce(velocity, tempDragForce)) continue;
      externalForce.add(tempDragForce);
    }
  });

  return null;
};
