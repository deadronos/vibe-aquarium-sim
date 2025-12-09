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
type RigidLike =
  | RapierRigidBody
  | { applyImpulse: (v: Vector3 | { x: number; y: number; z: number }, wake?: boolean) => void };

export function applyQueuedForcesToRigidBody(
  rigidBody: RigidLike | null,
  entity: Entity,
  delta: number
) {
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

  const dragMagnitude =
    0.5 *
    waterPhysics.density *
    waterPhysics.dragCoefficient *
    waterPhysics.crossSectionArea *
    speedSq;

  tempVelocity.copy(velocity).normalize();
  out.copy(tempVelocity).multiplyScalar(-dragMagnitude);
  return true;
}

/**
 * Compute a simple procedural water current vector for a given position and time.
 * Returns true if a non-negligible current was written to `out`.
 */
export function computeWaterCurrent(position: Vector3, time: number, out: Vector3) {
  tempVelocity.copy(position);
  const strength = 0.03;

  const cx =
    Math.sin(time * 0.2 + tempVelocity.x * 0.5) * 0.5 +
    Math.cos(time * 0.13 + tempVelocity.z * 0.3) * 0.5;
  const cz =
    Math.cos(time * 0.2 + tempVelocity.z * 0.5) * 0.5 -
    Math.sin(time * 0.13 + tempVelocity.x * 0.3) * 0.5;

  tempImpulseA.set(cx, 0, cz);
  if (tempImpulseA.lengthSq() < 1e-6) {
    out.set(0, 0, 0);
    return false;
  }

  tempImpulseA.normalize().multiplyScalar(strength);
  out.copy(tempImpulseA);
  return true;
}

export default applyQueuedForcesToRigidBody;
