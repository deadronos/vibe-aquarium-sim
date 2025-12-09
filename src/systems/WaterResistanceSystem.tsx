import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { world } from '../store';
import { waterPhysics } from '../config/waterPhysics';

const tempDragForce = new Vector3();
const tempVelocity = new Vector3();

/**
 * Compute water drag force for a velocity vector and write result to `out`.
 * Returns true if a non-negligible drag was written.
 */
export const computeDragForce = (velocity: Vector3, out: Vector3) => {
  const speedSq = velocity.lengthSq();
  if (speedSq < 0.0001) {
    out.set(0, 0, 0);
    return false;
  }

  const dragMagnitude = 0.5 * waterPhysics.density * waterPhysics.dragCoefficient * waterPhysics.crossSectionArea * speedSq;

  tempVelocity.copy(velocity).normalize();
  out.copy(tempVelocity).multiplyScalar(-dragMagnitude);
  return true;
};

export const WaterResistanceSystem = () => {
  useFrame(() => {
    // Iterate over all entities with velocity and rigidBody
    // Note: 'isFish' is used to filter, but any entity with velocity/rigidBody might be subject to drag.
    // However, the design specifies 'isFish'.
    for (const entity of world.with('isFish', 'velocity', 'externalForce')) {
      const { velocity, externalForce } = entity;

        // Skip if velocity is negligible
        const speedSq = velocity.lengthSq();
        if (speedSq < 0.0001) continue;

        // F_drag = 0.5 * rho * Cd * A * v^2
        const dragMagnitude = 0.5 * waterPhysics.density * waterPhysics.dragCoefficient * waterPhysics.crossSectionArea * speedSq;

        // Compute drag and queue it on the entity; the component owning the RigidBody
        // will apply queued forces at a safe point to avoid WASM re-entrancy.
        computeDragForce(velocity, tempDragForce);
        externalForce.set(0, 0, 0).add(tempDragForce);
    }
  });

  return null;
};
