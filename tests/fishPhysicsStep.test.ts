import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { applyFishPhysicsStep, syncFishPhysicsState } from '../src/components/fishPhysicsStep';
import type { Entity } from '../src/store';

class MockRigidBody {
  private readonly position = { x: 0, y: 0, z: 0 };
  private readonly velocity = { x: 0, y: 0, z: 0 };

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
}

function createFish(overrides: Partial<Entity> = {}): Entity {
  return {
    targetVelocity: new Vector3(),
    steeringForce: new Vector3(),
    externalForce: new Vector3(),
    position: new Vector3(),
    velocity: new Vector3(),
    modelIndex: 0,
    ...overrides,
  };
}

describe('applyFishPhysicsStep', () => {
  it('consumes queued forces once per fixed physics step', () => {
    const rigidBody = new MockRigidBody();
    const entity = createFish({
      steeringForce: new Vector3(0.1, 0, 0),
      externalForce: new Vector3(0.2, 0, 0),
    });

    applyFishPhysicsStep(rigidBody, entity, 0.5);
    syncFishPhysicsState(rigidBody, entity);
    const velocityAfterFirstStep = rigidBody.linvel().x;

    applyFishPhysicsStep(rigidBody, entity, 0.5);

    expect(velocityAfterFirstStep).toBeCloseTo(0.15);
    expect(rigidBody.linvel().x).toBeCloseTo(velocityAfterFirstStep);
    expect(entity.steeringForce?.lengthSq()).toBe(0);
    expect(entity.externalForce?.lengthSq()).toBe(0);
  });

  it('keeps ECS transform state for the post-step render sync', () => {
    const rigidBody = new MockRigidBody();
    rigidBody.setTranslation({ x: 0.5, y: 0.25, z: -0.25 });
    const entity = createFish();

    applyFishPhysicsStep(rigidBody, entity, 1 / 60);

    expect(entity.position?.toArray()).toEqual([0, 0, 0]);
    expect(entity.velocity?.toArray()).toEqual([0, 0, 0]);
  });

  it('corrects a tunneled fish immediately after the physics step', () => {
    const rigidBody = new MockRigidBody();
    rigidBody.setTranslation({ x: 1.95, y: 0, z: 0 });
    rigidBody.setLinvel({ x: 0.2, y: 0, z: 0 });
    const entity = createFish();

    syncFishPhysicsState(rigidBody, entity);

    expect(rigidBody.translation().x).toBeCloseTo(1.9);
    expect(rigidBody.linvel().x).toBeCloseTo(-0.1);
    expect(entity.position?.x).toBeCloseTo(1.9);
    expect(entity.velocity?.x).toBeCloseTo(-0.1);
  });
});
