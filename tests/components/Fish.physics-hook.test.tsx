import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Vector3 } from 'three';
import type { Entity } from '../../src/store';

const { beforeStepSpy, frameSpy, rigidBody } = vi.hoisted(() => {
  const body = {
    handle: 1,
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    translation() {
      return this.position;
    },
    linvel() {
      return this.velocity;
    },
    setLinvel(next: { x: number; y: number; z: number }) {
      this.velocity = { x: next.x, y: next.y, z: next.z };
    },
    setTranslation(next: { x: number; y: number; z: number }) {
      this.position = { x: next.x, y: next.y, z: next.z };
    },
  };

  return {
    beforeStepSpy: vi.fn(),
    frameSpy: vi.fn(),
    rigidBody: body,
  };
});

vi.mock('@react-three/fiber', () => ({ useFrame: frameSpy }));

vi.mock('@react-three/rapier', () => {
  const RigidBody = React.forwardRef<unknown, { children?: React.ReactNode }>((props, ref) => {
    React.useImperativeHandle(ref, () => rigidBody, []);
    return React.createElement(React.Fragment, null, props.children);
  });

  return {
    BallCollider: () => null,
    RigidBody,
    useBeforePhysicsStep: beforeStepSpy,
  };
});

import { Fish } from '../../src/components/Fish';

function createFish(): Entity {
  return {
    isFish: true,
    modelIndex: 0,
    targetVelocity: new Vector3(),
    steeringForce: new Vector3(0.1, 0, 0),
    externalForce: new Vector3(),
    position: new Vector3(),
    velocity: new Vector3(),
  };
}

describe('Fish physics hook integration', () => {
  beforeEach(() => {
    beforeStepSpy.mockClear();
    frameSpy.mockClear();
    rigidBody.position = { x: 0, y: 0, z: 0 };
    rigidBody.velocity = { x: 0, y: 0, z: 0 };
  });

  it('registers fixed-step physics separately from render synchronization', () => {
    const entity = createFish();

    render(<Fish entity={entity} />);

    expect(beforeStepSpy).toHaveBeenCalledTimes(1);
    expect(frameSpy).toHaveBeenCalledTimes(1);
  });

  it('applies queued steering through the registered physics callback', () => {
    const entity = createFish();
    render(<Fish entity={entity} />);

    const beforeStep = beforeStepSpy.mock.calls[0]?.[0] as ((world: unknown) => void) | undefined;
    expect(beforeStep).toBeTypeOf('function');
    beforeStep?.({});

    expect(rigidBody.velocity.x).toBeGreaterThan(0);
    expect(entity.steeringForce?.lengthSq()).toBe(0);
  });
});
