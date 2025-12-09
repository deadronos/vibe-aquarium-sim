import { Vector3 } from 'three';
import type { Entity } from '../store';
import { waterPhysics } from '../config/waterPhysics';
import type { RapierRigidBody } from '@react-three/rapier';

const tempImpulseA = new Vector3();
const tempImpulseB = new Vector3();
const tempVelocity = new Vector3();

/**
 * Apply queued forces from `entity` to the provided `rigidBody` wrapper.
 * - `steeringForce` is treated as a force converted to an impulse by multiplying by `delta`.
 * - `externalForce` is treated as a force and converted to impulse by multiplying by `delta`.
 * After applying, `externalForce` is cleared.
 */
type RigidLike = RapierRigidBody | { applyImpulse: (v: Vector3 | { x: number; y: number; z: number }, wake?: boolean) => void };

export function applyQueuedForcesToRigidBody(rigidBody: RigidLike | null, entity: Entity, delta: number) {
  if (!rigidBody) return;

  const EPS = 1e-6;
  if (entity.steeringForce && entity.steeringForce.lengthSq() > EPS) {
    tempImpulseA.copy(entity.steeringForce).multiplyScalar(delta);
    rigidBody.applyImpulse(tempImpulseA, true);
  }

  if (entity.externalForce && entity.externalForce.lengthSq() > EPS) {
    tempImpulseB.copy(entity.externalForce).multiplyScalar(delta);
    rigidBody.applyImpulse(tempImpulseB, true);
    entity.externalForce.set(0, 0, 0);
  }
}

/**
 * Compute water drag force for a velocity vector and write result to `out`.
 * Returns true if a non-negligible drag was written.
 */
export function computeDragForce(velocity: Vector3, out: Vector3) {
  const speedSq = velocity.lengthSq();
  if (speedSq < 0.0001) {
    out.set(0, 0, 0);
    return false;
  }

  const dragMagnitude = 0.5 * waterPhysics.density * waterPhysics.dragCoefficient * waterPhysics.crossSectionArea * speedSq;

  tempVelocity.copy(velocity).normalize();
  out.copy(tempVelocity).multiplyScalar(-dragMagnitude);
  return true;
}

export default applyQueuedForcesToRigidBody;
