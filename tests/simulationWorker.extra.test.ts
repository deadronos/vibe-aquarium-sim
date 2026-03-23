import { describe, it, expect } from 'vitest';
import { simulateStep } from '../src/workers/boids/index';
import type { SimulationInput } from '../src/workers/boids/types';

const makeInput = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
  const fishCount = overrides.fishCount ?? 1;
  const positions = overrides.positions ?? new Float32Array(fishCount * 3);
  const velocities = overrides.velocities ?? new Float32Array(fishCount * 3);
  const modelIndices = overrides.modelIndices ?? new Int32Array(fishCount);
  const foodCount = overrides.foodCount ?? 0;
  const foodPositions = overrides.foodPositions ?? new Float32Array(foodCount * 3);

  return {
    fishCount,
    positions,
    velocities,
    modelIndices,
    species: [
      {
        maxSpeed: 5,
        maxForce: 0.1,
        neighborDist: 10,
        separationDist: 5,
        weights: { separation: 2.0, alignment: 1.0, cohesion: 1.0 },
      },
    ],
    foodCount,
    foodPositions,
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
  } as SimulationInput;
};

describe('simulationWorker extra tests', () => {
  it('handles zero fishCount gracefully', () => {
    const input = makeInput({
      fishCount: 0,
      positions: new Float32Array(0),
      velocities: new Float32Array(0),
      modelIndices: new Int32Array(0),
    });
    const out = simulateStep(input);

    expect(out.steering.length).toBe(0);
    expect(out.externalForces.length).toBe(0);
    expect(out.eatenFoodIndices).toHaveLength(0);
  });

  it('two fish close to each other produce non-zero steering (separation/alignment/cohesion)', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0]);
    const velocities = new Float32Array([1, 0, 0, -1, 0, 0]);
    const input = makeInput({ fishCount: 2, positions, velocities });
    const out = simulateStep(input);

    const anyNonZero = out.steering.some((v) => v !== 0);
    expect(anyNonZero).toBe(true);
  });

  it('does not leak old steering when fishCount decreases', () => {
    simulateStep(makeInput({ fishCount: 300 }));

    const small = makeInput({
      fishCount: 2,
      positions: new Float32Array(6),
      velocities: new Float32Array(6),
    });
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
      species: [{
        maxSpeed: 5,
        maxForce: tinyMaxForce,
        neighborDist: 10,
        separationDist: 5,
        weights: { separation: 2.0, alignment: 1.0, cohesion: 1.0 },
      }],
      boids: { neighborDist: 10, separationDist: 5, maxSpeed: 5, maxForce: tinyMaxForce },
    });

    const out = simulateStep(input);
    const sx = out.steering[0];
    const sy = out.steering[1];
    const sz = out.steering[2];
    const mag = Math.sqrt(sx * sx + sy * sy + sz * sz);

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
    expect(Number.isNaN(out.steering[0]) || out.steering[0] === 0).toBe(true);
  });

  it('drag component is zero when velocity is exactly zero (external == current only)', () => {
    const input = makeInput({
      fishCount: 1,
      positions: new Float32Array([1.37, 0, 2.11]),
      velocities: new Float32Array([0, 0, 0]),
      time: 1.23,
      water: { density: 1, dragCoefficient: 2.0, crossSectionArea: 1 },
    });

    const out = simulateStep(input);
    expect(out.externalForces[0]).not.toBe(0);
    expect(out.externalForces[2]).not.toBe(0);
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

  it('deduplicates the same eaten food index when multiple fish reach it in one step', () => {
    const input = makeInput({
      fishCount: 2,
      positions: new Float32Array([
        0, 0, 0,
        0.001, 0, 0,
      ]),
      velocities: new Float32Array(6),
      foodCount: 1,
      foodPositions: new Float32Array([0.05, 0, 0]),
    });

    const out = simulateStep(input);

    expect(out.eatenFoodIndices).toEqual([0]);
  });
});
