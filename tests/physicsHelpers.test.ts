import { describe, it, expect, vi } from 'vitest';
import { Vector3 } from 'three';
import { integrateForcesToVelocity, computeDragForce } from '../src/utils/physicsHelpers';
import type { Entity } from '../src/store';

describe('integrateForcesToVelocity', () => {
  it('applies steeringForce to targetVelocity scaled by delta', () => {
    const targetVelocity = new Vector3(0, 0, 0);
    const entity = {
      steeringForce: new Vector3(1, 0, 0),
      externalForce: new Vector3(),
    } as unknown as Entity;

    integrateForcesToVelocity(targetVelocity, entity, 0.5);

    expect(targetVelocity.x).toBeCloseTo(0.5);
    expect(targetVelocity.y).toBeCloseTo(0);
    expect(targetVelocity.z).toBeCloseTo(0);
  });

  it('applies externalForce and clears it afterwards', () => {
    const targetVelocity = new Vector3(0, 0, 0);
    const entity = {
      steeringForce: new Vector3(),
      externalForce: new Vector3(1, 0, 0),
    } as unknown as Entity;

    integrateForcesToVelocity(targetVelocity, entity, 1 / 60);

    expect(targetVelocity.x).toBeCloseTo(1 / 60);
    expect(entity.externalForce.x).toBeCloseTo(0);
    expect(entity.externalForce.y).toBeCloseTo(0);
    expect(entity.externalForce.z).toBeCloseTo(0);
  });

  it('applies steering and external forces in sequence', () => {
    const targetVelocity = new Vector3(0, 0, 0);
    const entity = {
      steeringForce: new Vector3(0.5, 0, 0),
      externalForce: new Vector3(1, 0, 0),
    } as unknown as Entity;

    integrateForcesToVelocity(targetVelocity, entity, 0.5);

    // steering: 0.5 * 0.5 = 0.25
    // external: 1.0 * 0.5 = 0.5
    // total: 0.75
    expect(targetVelocity.x).toBeCloseTo(0.75);
    expect(entity.externalForce.x).toBeCloseTo(0);
  });

  it('systems can compute drag and queue it, then integration applies it', () => {
    const targetVelocity = new Vector3(1, 0, 0);
    const entity = {
      velocity: new Vector3(1, 0, 0),
      externalForce: new Vector3(),
      steeringForce: new Vector3(),
    } as unknown as Entity;

    // 1. System computes drag
    const out = new Vector3();
    const ok = computeDragForce(entity.velocity, out);
    expect(ok).toBe(true);
    entity.externalForce.copy(out);

    // 2. Integration applies it to targetVelocity
    const initialVelX = targetVelocity.x;
    integrateForcesToVelocity(targetVelocity, entity, 1 / 60);

    // Drag opposes velocity, so velocity should decrease
    expect(targetVelocity.x).toBeLessThan(initialVelX);
    expect(entity.externalForce.x).toBeCloseTo(0);
  });
});
