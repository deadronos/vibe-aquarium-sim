import { describe, it, expect } from 'vitest';
import { simulateStep, SimulationInput } from '../src/workers/simulationWorker';

const makeInput = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
  const fishCount = 1;
  const positions = new Float32Array(fishCount * 3);
  const velocities = new Float32Array(fishCount * 3);
  return {
    fishCount,
    positions,
    velocities,
    foodCount: 0,
    foodPositions: new Float32Array(0),
    time: 0,
    boids: {
      neighborDist: 10,
      separationDist: 5,
      maxSpeed: 5,
      maxForce: 0.1,
    },
    bounds: { x: 100, y: 100, z: 100 },
    water: { density: 1, dragCoefficient: 0.01, crossSectionArea: 1 },
    current: {
      strength: 0.03,
      frequency1: 0.2,
      frequency2: 0.13,
      spatialScale1: 0.5,
      spatialScale2: 0.3,
    },
    ...overrides,
  };
};

describe('simulationWorker extra tests', () => {
  it('handles zero fishCount gracefully', () => {
    const input = makeInput({
      fishCount: 0,
      positions: new Float32Array(0),
      velocities: new Float32Array(0),
    });
    const out = simulateStep(input);

    expect(out.steering.length).toBe(0);
    expect(out.externalForces.length).toBe(0);
    expect(out.eatenFoodIndices).toHaveLength(0);
  });

  it('two fish close to each other produce non-zero steering (separation/alignment/cohesion)', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0]); // two fish at x=0 and x=1 within neighborDist
    const velocities = new Float32Array([1, 0, 0, -1, 0, 0]); // opposite velocities
    const input = makeInput({ fishCount: 2, positions, velocities });
    const out = simulateStep(input);

    // Expect that at least one steering component is non-zero (they should react)
    const anyNonZero = out.steering.some((v) => v !== 0);
    expect(anyNonZero).toBe(true);
  });

  it('does not leak old steering when fishCount decreases', () => {
    // Prime the cache with a large count
    simulateStep(makeInput({ fishCount: 300 }));

    const small = makeInput({
      fishCount: 2,
      positions: new Float32Array(6),
      velocities: new Float32Array(6),
    });
    // All zeros positions/velocities shouldn't produce forces
    const out = simulateStep(small);
    expect(out.steering.every((v) => v === 0)).toBe(true);
  });

  it('limits seek force to maxForceDouble when target is far and maxForce is tiny', () => {
    const tinyMaxForce = 1e-6;
    const input = makeInput({
      fishCount: 1,
      positions: new Float32Array([0, 0, 0]),
      velocities: new Float32Array([0, 0, 0]),
      foodCount: 1,
      foodPositions: new Float32Array([1000, 0, 0]),
      boids: { neighborDist: 10, separationDist: 5, maxSpeed: 5, maxForce: tinyMaxForce },
    });

    const out = simulateStep(input);
    const sx = out.steering[0];
    const sy = out.steering[1];
    const sz = out.steering[2];
    const mag = Math.sqrt(sx * sx + sy * sy + sz * sz);

    // Should be capped by roughly maxForce*2 (seek uses maxForceDouble)
    expect(mag).toBeLessThanOrEqual(tinyMaxForce * 2 + 1e-8);
  });

  it('does not throw on NaN positions and returns steering with NaN where appropriate', () => {
    const input = makeInput({
      fishCount: 1,
      positions: new Float32Array([NaN, 0, 0]),
      velocities: new Float32Array([0, 0, 0]),
    });
    expect(() => simulateStep(input)).not.toThrow();
    const out = simulateStep(input);
    // If NaN is present, steering should contain NaN (not crash)
    expect(Number.isNaN(out.steering[0]) || out.steering[0] === 0).toBe(true);
  });

  it('drag component is zero when velocity is exactly zero (external == current only)', () => {
    const input = makeInput({
      fishCount: 1,
      positions: new Float32Array([1.37, 0, 2.11]),
      velocities: new Float32Array([0, 0, 0]),
      time: 1.23,
      water: { density: 1, dragCoefficient: 2.0, crossSectionArea: 1 }, // large drag coeff to amplify any mistake
    });

    const out = simulateStep(input);

    // Compute expected current as in implementation
    const px = 1.37;
    const pz = 2.11;
    const t = 1.23;
    const strength = 0.03;
    const cx = Math.sin(t * 0.2 + px * 0.5) * 0.5 + Math.cos(t * 0.13 + pz * 0.3) * 0.5;
    const cz = Math.cos(t * 0.2 + pz * 0.5) * 0.5 - Math.sin(t * 0.13 + px * 0.3) * 0.5;
    let currentX = cx;
    let currentZ = cz;
    const currentLenSq = currentX * currentX + currentZ * currentZ;
    let expX = 0;
    let expZ = 0;
    if (currentLenSq >= 1e-6) {
      const invCurrent = 1 / Math.sqrt(currentLenSq);
      currentX *= invCurrent * strength;
      currentZ *= invCurrent * strength;
      expX = currentX;
      expZ = currentZ;
    }

    // externalForces equals current + drag (drag should be 0 because velocity=0)
    expect(out.externalForces[0]).toBeCloseTo(expX, 6);
    expect(out.externalForces[2]).toBeCloseTo(expZ, 6);
  });

  it('clears eatenFoodIndices between calls (no leak)', () => {
    const inputEat = makeInput({
      fishCount: 1,
      positions: new Float32Array([0, 0, 0]),
      velocities: new Float32Array([0, 0, 0]),
      foodCount: 1,
      foodPositions: new Float32Array([0.05, 0, 0]),
    });

    const first = simulateStep(inputEat);
    expect(first.eatenFoodIndices).toContain(0);

    const none = makeInput({ fishCount: 1, positions: new Float32Array([0, 0, 0]) });
    const second = simulateStep(none);
    expect(second.eatenFoodIndices).toHaveLength(0);
  });
});
