import { Vector3 } from 'three';
import type { Entity } from '../../src/store';
import { applyFishPhysicsStep, syncFishPhysicsState } from '../../src/components/fishPhysicsStep';
import { FixedStepScheduler } from '../../src/utils/FixedStepScheduler';

export interface TrajectoryRequest {
  renderHz: number;
  durationSeconds: number;
}

export interface TrajectorySnapshot {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export interface TrajectoryTrace {
  tickCount: number;
  final: TrajectorySnapshot;
  samples: TrajectorySnapshot[];
  forceQueuesCleared: boolean;
}

class DeterministicRigidBody {
  private readonly position = { x: 0, y: 0, z: 0 };
  private readonly velocity = { x: 0, y: 0, z: 0 };

  constructor(initialPosition: Vector3, initialVelocity: Vector3) {
    this.position.x = initialPosition.x;
    this.position.y = initialPosition.y;
    this.position.z = initialPosition.z;
    this.velocity.x = initialVelocity.x;
    this.velocity.y = initialVelocity.y;
    this.velocity.z = initialVelocity.z;
  }

  translation() {
    return this.position;
  }

  linvel() {
    return this.velocity;
  }

  setLinvel(next: { x: number; y: number; z: number }) {
    this.velocity.x = next.x;
    this.velocity.y = next.y;
    this.velocity.z = next.z;
  }

  setTranslation(next: { x: number; y: number; z: number }) {
    this.position.x = next.x;
    this.position.y = next.y;
    this.position.z = next.z;
  }

  integrate(fixedDt: number) {
    this.position.x += this.velocity.x * fixedDt;
    this.position.y += this.velocity.y * fixedDt;
    this.position.z += this.velocity.z * fixedDt;
  }
}

function snapshot(rigidBody: DeterministicRigidBody): TrajectorySnapshot {
  const position = rigidBody.translation();
  const velocity = rigidBody.linvel();

  return {
    position: { x: position.x, y: position.y, z: position.z },
    velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
  };
}

function createEntity(initialPosition: Vector3, initialVelocity: Vector3): Entity {
  return {
    isFish: true,
    isBoid: true,
    modelIndex: 0,
    position: initialPosition.clone(),
    velocity: initialVelocity.clone(),
    targetVelocity: initialVelocity.clone(),
    steeringForce: new Vector3(),
    externalForce: new Vector3(),
  };
}

export function runFixedStepTrajectory(request: TrajectoryRequest): TrajectoryTrace {
  const { renderHz, durationSeconds } = request;
  if (![30, 60, 120].includes(renderHz)) {
    throw new Error('renderHz must be 30, 60, or 120');
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('durationSeconds must be positive');
  }

  const frameCount = Math.round(renderHz * durationSeconds);
  if (frameCount <= 0 || Math.abs(frameCount - renderHz * durationSeconds) > 1e-9) {
    throw new Error('durationSeconds must produce a whole number of render frames');
  }

  const initialPosition = new Vector3(-0.25, 0.1, -0.15);
  const initialVelocity = new Vector3(0.04, -0.015, 0.02);
  const entity = createEntity(initialPosition, initialVelocity);
  const rigidBody = new DeterministicRigidBody(initialPosition, initialVelocity);
  const scheduler = new FixedStepScheduler(1 / 60, 5);
  const samples: TrajectorySnapshot[] = [];
  let forceQueuesCleared = true;
  const steering = new Vector3(0.008, 0.004, -0.006);
  const externalForce = new Vector3(0.002, -0.001, 0.0015);

  scheduler.add((fixedDt) => {
    entity.steeringForce?.copy(steering);
    entity.externalForce?.copy(externalForce);
    applyFishPhysicsStep(rigidBody, entity, fixedDt);
    if (
      (entity.steeringForce?.lengthSq() ?? 0) !== 0 ||
      (entity.externalForce?.lengthSq() ?? 0) !== 0
    ) {
      forceQueuesCleared = false;
    }
    rigidBody.integrate(fixedDt);
    syncFishPhysicsState(rigidBody, entity);
    samples.push(snapshot(rigidBody));
  });

  const renderDelta = 1 / renderHz;
  for (let frame = 0; frame < frameCount; frame++) {
    scheduler.update(renderDelta);
  }

  const final = samples.at(-1);
  if (!final) {
    throw new Error('trajectory produced no fixed-step samples');
  }

  return { tickCount: samples.length, final, samples, forceQueuesCleared };
}
