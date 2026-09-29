import { describe, expect, it } from 'vitest';

import { SIMULATION_BOUNDS } from '../src/config/constants';
import { clampToSimulationBounds } from '../src/utils/boundaryUtils';
import { clamp } from '../src/utils/mathUtils';

describe('clamp', () => {
  it('returns the value when it is within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps values below min and above max', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(42, 0, 10)).toBe(10);
  });

  it('treats bounds as inclusive', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('clampToSimulationBounds', () => {
  it('clamps to +/- SIMULATION_BOUNDS.x by default', () => {
    const over = SIMULATION_BOUNDS.x + 1;
    expect(clampToSimulationBounds(over)).toBe(SIMULATION_BOUNDS.x);
    expect(clampToSimulationBounds(-over)).toBe(-SIMULATION_BOUNDS.x);
  });

  it('passes through values inside the bounds', () => {
    expect(clampToSimulationBounds(0)).toBe(0);
    expect(clampToSimulationBounds(SIMULATION_BOUNDS.x - 0.1)).toBe(SIMULATION_BOUNDS.x - 0.1);
  });

  it('uses the axis bound supplied by the caller', () => {
    const over = SIMULATION_BOUNDS.z + 1;
    expect(clampToSimulationBounds(over, SIMULATION_BOUNDS.z)).toBe(SIMULATION_BOUNDS.z);
    expect(clampToSimulationBounds(-over, SIMULATION_BOUNDS.z)).toBe(-SIMULATION_BOUNDS.z);
  });
});
