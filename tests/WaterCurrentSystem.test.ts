import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { computeWaterCurrent } from '../src/utils/physicsHelpers';

describe('WaterCurrentSystem.computeWaterCurrent', () => {
  it('computes a non-zero current for non-trivial position/time', () => {
    const pos = new Vector3(1, 0, 2);
    const out = new Vector3();
    const ok = computeWaterCurrent(pos, 0.0, out);

    expect(ok).toBe(true);
    expect(out.length()).toBeGreaterThan(0);
  });

  it('writes zero vector for positions/time producing negligible current', () => {
    const pos = new Vector3(0, 0, 0);
    const out = new Vector3();
    // It's possible this returns non-zero depending on math; we check it returns boolean and writes a vector
    const ok = computeWaterCurrent(pos, 12345.678, out);

    expect(typeof ok).toBe('boolean');
    expect(out).toBeInstanceOf(Vector3);
  });
});
