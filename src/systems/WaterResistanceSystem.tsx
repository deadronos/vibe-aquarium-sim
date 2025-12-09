import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { world } from '../store';
import { waterPhysics } from '../config/waterPhysics';

const tempDragForce = new Vector3();
const tempVelocity = new Vector3();

export const WaterResistanceSystem = () => {
  useFrame(() => {
    // Iterate over all entities with velocity and rigidBody
    // Note: 'isFish' is used to filter, but any entity with velocity/rigidBody might be subject to drag.
    // However, the design specifies 'isFish'.
    for (const entity of world.with('isFish', 'velocity', 'rigidBody')) {
        const { velocity, rigidBody } = entity;

        // Skip if velocity is negligible
        const speedSq = velocity.lengthSq();
        if (speedSq < 0.0001) continue;

        // F_drag = 0.5 * rho * Cd * A * v^2
        const dragMagnitude = 0.5 * waterPhysics.density * waterPhysics.dragCoefficient * waterPhysics.crossSectionArea * speedSq;

        // Direction is opposite to velocity
        tempVelocity.copy(velocity).normalize();
        tempDragForce.copy(tempVelocity).multiplyScalar(-dragMagnitude);

        // Apply to rigid body
        rigidBody.addForce(tempDragForce, true);
    }
  });

  return null;
};
