import { describe, it, expect } from 'vitest';
import { simulateStep } from '../src/workers/boids/index';
import type { SimulationInput } from '../src/workers/boids/types';

describe('simulationWorker', () => {
  const createInput = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
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

  it('should produce consistent results across multiple calls (state reset check)', () => {
    const input = createInput({
      fishCount: 10,
      positions: new Float32Array(30),
      velocities: new Float32Array(30),
    });
    // Randomize
    for (let i = 0; i < 30; i++) {
      input.positions[i] = Math.random() * 100 - 50;
      input.velocities[i] = Math.random() * 2 - 1;
    }

    const result1 = simulateStep(input);
    const steering1 = Float32Array.from(result1.steering);

    const result2 = simulateStep(input);
    const steering2 = result2.steering;

    expect(steering2).toEqual(steering1);
  });

  it('applies boundary forces when out of bounds', () => {
    const input = createInput();
    input.positions[0] = 101; // Out of bounds (limit 100)

    const result = simulateStep(input);
    // Should steer towards negative x
    expect(result.steering[0]).toBeLessThan(0);
  });

  it('applies boundary forces on negative side', () => {
    const input = createInput();
    input.positions[0] = -101;

    const result = simulateStep(input);
    // Should steer towards positive x
    expect(result.steering[0]).toBeGreaterThan(0);
  });

  it('applies drag forces based on velocity', () => {
    const input = createInput();
    input.velocities[0] = 10; // High speed

    const result = simulateStep(input);
    // External force (drag) should oppose velocity
    expect(result.externalForces[0]).toBeLessThan(0);
  });

  it('calculates water currents', () => {
    const input = createInput();
    const result = simulateStep(input);
    expect(result.externalForces[0]).not.toBe(0);
    expect(result.externalForces[2]).not.toBe(0);
  });

  it('resizes cache when fish count increases', () => {
    simulateStep(createInput({ fishCount: 10 }));

    const largeCount = 3000;
    const input = createInput({
      fishCount: largeCount,
      positions: new Float32Array(largeCount * 3),
      velocities: new Float32Array(largeCount * 3),
      modelIndices: new Int32Array(largeCount),
    });

    const result = simulateStep(input);
    expect(result.steering.length).toBe(largeCount * 3);
  });

  it('handles feeding logic (seeking food)', () => {
    const input = createInput({
      foodCount: 1,
      foodPositions: new Float32Array([4, 0, 0]),
      positions: new Float32Array([0, 0, 0]),
      velocities: new Float32Array([0, 0, 0]),
    });

    const result = simulateStep(input);
    expect(result.steering[0]).toBeGreaterThan(0);
    expect(result.eatenFoodIndices).toHaveLength(0);
  });

  it('handles eating food (close range)', () => {
    const input = createInput({
      foodCount: 1,
      foodPositions: new Float32Array([0.05, 0, 0]),
      positions: new Float32Array([0, 0, 0]),
      velocities: new Float32Array([0, 0, 0]),
    });

    const result = simulateStep(input);
    expect(result.eatenFoodIndices).toContain(0);
  });

  it('ignores food if too far', () => {
    const input = createInput({
      foodCount: 1,
      foodPositions: new Float32Array([100, 0, 0]),
      positions: new Float32Array([0, 0, 0]),
    });

    const result = simulateStep(input);
    expect(result.steering[0]).toBe(0);
  });
});
