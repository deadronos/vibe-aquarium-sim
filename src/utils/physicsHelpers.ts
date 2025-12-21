import { Vector3 } from 'three';
import type { Entity } from '../store';
import { waterPhysics } from '../config/waterPhysics';

const tempImpulseA = new Vector3();
const tempImpulseB = new Vector3();
const tempVelocity = new Vector3();

/**
 * Applies queued forces (steeringForce, externalForce) to a target velocity vector.
 * - `steeringForce` is integrated as acceleration * dt.
 * - `externalForce` is integrated as acceleration * dt.
 * - Clears `externalForce` after application.
 *
 * @param targetVelocity The velocity vector to modify.
 * @param entity The entity containing the forces.
 * @param dt Time delta.
 * @param mass Mass of the entity. If 1.0 (default), forces are treated as acceleration.
 */
export function integrateForcesToVelocity(
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
