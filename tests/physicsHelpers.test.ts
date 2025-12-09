import { describe, it, expect, vi } from 'vitest';
import { Vector3 } from 'three';
import { applyQueuedForcesToRigidBody, computeDragForce } from '../src/utils/physicsHelpers';
import type { Entity } from '../src/store';

describe('applyQueuedForcesToRigidBody', () => {
  it('applies steeringForce as an impulse scaled by delta', () => {
    const rb = { applyImpulse: vi.fn() } as unknown as {
      applyImpulse: (v: Vector3, wake?: boolean) => void;
    };
    const entity = {
      steeringForce: new Vector3(1, 0, 0),
      externalForce: new Vector3(),
    } as unknown as Entity;

    applyQueuedForcesToRigidBody(rb, entity, 0.5);

    expect(rb.applyImpulse).toHaveBeenCalledTimes(1);
    const arg = rb.applyImpulse.mock.calls[0][0];
    expect(arg.x).toBeCloseTo(0.5);
    expect(arg.y).toBeCloseTo(0);
    expect(arg.z).toBeCloseTo(0);
  });

  it('applies externalForce and clears it afterwards', () => {
    const rb = { applyImpulse: vi.fn() } as unknown as {
      applyImpulse: (v: Vector3, wake?: boolean) => void;
    };
    const entity = {
      steeringForce: new Vector3(),
      externalForce: new Vector3(1, 0, 0),
    } as unknown as Entity;

    applyQueuedForcesToRigidBody(rb, entity, 1 / 60);

    expect(rb.applyImpulse).toHaveBeenCalledTimes(1);
    const arg = rb.applyImpulse.mock.calls[0][0];
    expect(arg.x).toBeCloseTo(1 / 60);
    expect(entity.externalForce.x).toBeCloseTo(0);
    expect(entity.externalForce.y).toBeCloseTo(0);
    expect(entity.externalForce.z).toBeCloseTo(0);
  });

  it('applies steering and external forces in sequence', () => {
    const rb = { applyImpulse: vi.fn() } as unknown as {
      applyImpulse: (v: Vector3, wake?: boolean) => void;
    };
    const entity = {
      steeringForce: new Vector3(0.5, 0, 0),
      externalForce: new Vector3(1, 0, 0),
    } as unknown as Entity;

    applyQueuedForcesToRigidBody(rb, entity, 0.5);

    expect(rb.applyImpulse).toHaveBeenCalledTimes(2);
    const call1 = rb.applyImpulse.mock.calls[0][0];
    const call2 = rb.applyImpulse.mock.calls[1][0];

    expect(call1.x).toBeCloseTo(0.25);
    expect(call2.x).toBeCloseTo(0.5);
    expect(entity.externalForce.x).toBeCloseTo(0);
  });

  it('systems can compute drag while a physics step is active and later apply the queued forces', () => {
    // Simulate a physics step re-entrancy flag
    let insidePhysicsStep = true;

    const rb = {
      applyImpulse: () => {
        if (insidePhysicsStep) throw new Error('Unsafe Rapier call during step');
      },
    } as unknown as { applyImpulse: (v: Vector3, wake?: boolean) => void };

    const entity = {
      velocity: new Vector3(1, 0, 0),
      externalForce: new Vector3(),
      steeringForce: new Vector3(),
    } as unknown as Entity;

    // While inside the physics step, system computes and queues forces (should NOT call RB)
    const out = new Vector3();
    const ok = computeDragForce(entity.velocity, out);
    expect(ok).toBe(true);
    entity.externalForce.copy(out);

    // Now physics step finished — apply queued forces (should not throw)
    insidePhysicsStep = false;
    expect(() => applyQueuedForcesToRigidBody(rb, entity, 1 / 60)).not.toThrow();
  });
});
