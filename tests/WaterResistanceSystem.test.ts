import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { computeDragForce } from '../src/utils/physicsHelpers';
import { waterPhysics } from '../src/config/waterPhysics';

describe('WaterResistanceSystem.computeDragForce', () => {
  it('returns correct drag force direction and magnitude for unit velocity', () => {
    const velocity = new Vector3(1, 0, 0);
    const out = new Vector3();

    const ok = computeDragForce(velocity, out);
    expect(ok).toBe(true);

    const expectedMagnitude =
      0.5 *
      waterPhysics.density *
      waterPhysics.dragCoefficient *
      waterPhysics.crossSectionArea *
      velocity.lengthSq();
    expect(out.x).toBeCloseTo(-expectedMagnitude, 8);
    expect(out.y).toBeCloseTo(0, 8);
    expect(out.z).toBeCloseTo(0, 8);
  });

  it('returns false and zero when velocity is near zero', () => {
    const velocity = new Vector3(0.001, 0, 0);
    const out = new Vector3(1, 1, 1);

    const ok = computeDragForce(velocity, out);
    expect(ok).toBe(false);
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.z).toBe(0);
  });
});
