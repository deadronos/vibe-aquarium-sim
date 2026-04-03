import { Vector3 } from 'three';
import type { Entity } from '../store';

const tempImpulseA = new Vector3();
const tempImpulseB = new Vector3();

/**
 * Applies queued forces (steeringForce, externalForce) to a target velocity vector.
 * - `steeringForce` is integrated as acceleration * dt.
 * - `externalForce` is integrated as acceleration * dt.
 * - Clears `externalForce` after application.
 *
 * This function was previously named `integrateForcesToVelocity`.
 *
 * @param targetVelocity The velocity vector to modify.
 * @param entity The entity containing the forces.
 * @param dt Time delta.
 * @param mass Mass of the entity. If 1.0 (default), forces are treated as acceleration.
 */
export function applyQueuedForcesToRigidBody(
  targetVelocity: Vector3,
  entity: Entity,
  dt: number,
  mass: number = 1.0
) {
  const EPS = 1e-6;

  // Apply steering force
  if (entity.steeringForce && entity.steeringForce.lengthSq() > EPS) {
    tempImpulseA.copy(entity.steeringForce).multiplyScalar(dt);
    if (mass !== 1.0) tempImpulseA.divideScalar(mass);
    targetVelocity.add(tempImpulseA);
  }

  // Apply external force (drag, water current, etc.)
  if (entity.externalForce && entity.externalForce.lengthSq() > EPS) {
    tempImpulseB.copy(entity.externalForce).multiplyScalar(dt);
    if (mass !== 1.0) tempImpulseB.divideScalar(mass);
    targetVelocity.add(tempImpulseB);
    entity.externalForce.set(0, 0, 0);
  }
}

// Backward compatibility or for internal use if needed (aliasing)
export const integrateForcesToVelocity = applyQueuedForcesToRigidBody;
