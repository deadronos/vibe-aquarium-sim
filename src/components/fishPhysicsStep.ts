import { applyQueuedForcesToRigidBody } from '../utils/physicsHelpers';
import { clampPositionToTank, type Vec3Like } from '../utils/boundaryUtils';
import { BOIDS_CONFIG, SPECIES_CONFIG } from '../config/constants';
import type { Entity } from '../store';

export interface FishRigidBodyLike {
  translation(): Vec3Like;
  linvel(): Vec3Like;
  setLinvel(velocity: Vec3Like, wakeUp: boolean): void;
  setTranslation(position: Vec3Like, wakeUp: boolean): void;
}

const clampOutPosition: Vec3Like = { x: 0, y: 0, z: 0 };
const clampOutVelocity: Vec3Like = { x: 0, y: 0, z: 0 };

/**
 * Applies one fixed-timestep control update to a fish's rigid body.
 *
 * This is intentionally separate from React's render loop. Queued ECS forces
 * are consumed exactly once here, immediately before Rapier advances the
 * world, while the component's render callback only mirrors post-step state.
 */
export function applyFishPhysicsStep(
  rigidBody: FishRigidBodyLike,
  entity: Entity,
  fixedDt: number
): void {
  const targetVelocity = entity.targetVelocity;
  if (!targetVelocity) return;

  if (entity.modelIndex !== 0 && entity.modelIndex !== 1 && entity.modelIndex !== 2) {
    entity.modelIndex = 0;
  }

  // ECS velocity is synchronized after every physics step and avoids another
  // Rapier wrapper allocation in the fixed-step path. Use Rapier directly only
  // for entities that do not yet have a synchronized velocity.
  const currentVelocity = entity.velocity ?? rigidBody.linvel();
  targetVelocity.set(currentVelocity.x, currentVelocity.y, currentVelocity.z);

  applyQueuedForcesToRigidBody(targetVelocity, entity, fixedDt);

  const speciesMaxSpeed = SPECIES_CONFIG[entity.modelIndex ?? 0]?.maxSpeed ?? BOIDS_CONFIG.maxSpeed;

  if (entity.excitementLevel && entity.excitementLevel > 0.1) {
    const speedSq = targetVelocity.lengthSq();
    if (speedSq > 0.0001) {
      const speed = Math.sqrt(speedSq);
      const boostAmount = entity.excitementLevel * speciesMaxSpeed * 0.5;
      targetVelocity.multiplyScalar((speed + boostAmount) / speed);
    }
  }

  const isExcited = (entity.excitementLevel || 0) > 0.1;
  const maxAllowedSpeed = isExcited ? speciesMaxSpeed * 1.5 : speciesMaxSpeed * 1.1;
  const maxSpeedSq = maxAllowedSpeed * maxAllowedSpeed;
  const finalSpeedSq = targetVelocity.lengthSq();
  if (finalSpeedSq > maxSpeedSq) {
    targetVelocity.multiplyScalar(maxAllowedSpeed / Math.sqrt(finalSpeedSq));
  }

  rigidBody.setLinvel(targetVelocity, true);
}

/**
 * Mirrors the post-step Rapier state into ECS and applies the tank safety net.
 * Keeping this in an after-step callback ensures tunneling is corrected before
 * any render frame can observe an out-of-bounds fish.
 */
export function syncFishPhysicsState(rigidBody: FishRigidBodyLike, entity: Entity): void {
  const currentPosition = rigidBody.translation();
  const currentVelocity = rigidBody.linvel();

  const clamped = clampPositionToTank(
    currentPosition,
    currentVelocity,
    clampOutPosition,
    clampOutVelocity
  );

  if (clamped) {
    rigidBody.setTranslation(clampOutPosition, true);
    rigidBody.setLinvel(clampOutVelocity, true);
  }

  const position = clamped ? clampOutPosition : currentPosition;
  const velocity = clamped ? clampOutVelocity : currentVelocity;
  entity.position?.set(position.x, position.y, position.z);
  entity.velocity?.set(velocity.x, velocity.y, velocity.z);
  entity.targetVelocity?.set(velocity.x, velocity.y, velocity.z);
}
