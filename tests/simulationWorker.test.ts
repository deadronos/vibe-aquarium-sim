import { describe, it, expect, afterEach } from 'vitest';
import { simulateStep, SimulationInput } from '../src/workers/simulationWorker';

describe('simulationWorker', () => {
  // Helper to create basic input
  const createInput = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
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
      ...overrides,
    };
  };

  // Clean up cache between tests if needed, though most tests reuse it
  afterEach(() => {
    // @ts-expect-error - __boidsCache may be undefined in some environments
    if (globalThis.__boidsCache) {
      // We don't necessarily need to delete it, but we could if we want isolation
      // globalThis.__boidsCache = undefined;
    }
  });

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
    // Zero velocity to isolate current (drag is 0 at 0 speed)
    // Actually there's a check `if (speedSq >= 0.0001)` for drag.

    const result = simulateStep(input);
    // Current is calculated based on time and position.
    // At pos 0,0,0, time 0:
    // cx = sin(0) + cos(0) = 1
    // cz = cos(0) - sin(0) = 1
    // normalized and scaled by strength (0.03)

    expect(result.externalForces[0]).not.toBe(0);
    expect(result.externalForces[2]).not.toBe(0);
  });

  it('resizes cache when fish count increases', () => {
    // First call with small count
    simulateStep(createInput({ fishCount: 10 }));

    // Call with large count
    const largeCount = 3000; // > initial 2000
    const input = createInput({
      fishCount: largeCount,
      positions: new Float32Array(largeCount * 3),
      velocities: new Float32Array(largeCount * 3),
    });

    const result = simulateStep(input);
    expect(result.steering.length).toBe(largeCount * 3);
  });

  it('handles feeding logic (seeking food)', () => {
    const input = createInput({
      foodCount: 1,
      foodPositions: new Float32Array([4, 0, 0]), // Food at x=4 (Dist < 5)
      positions: new Float32Array([0, 0, 0]), // Fish at x=0
      velocities: new Float32Array([0, 0, 0]),
    });

    const result = simulateStep(input);
    // Should steer towards food (positive x)
    expect(result.steering[0]).toBeGreaterThan(0);
    expect(result.eatenFoodIndices).toHaveLength(0);
  });

  it('handles eating food (close range)', () => {
    const input = createInput({
      foodCount: 1,
      foodPositions: new Float32Array([0.05, 0, 0]), // Food very close
      positions: new Float32Array([0, 0, 0]),
      velocities: new Float32Array([0, 0, 0]),
    });

    // Distance sq = 0.0025 < 0.01 (eating threshold)
    const result = simulateStep(input);
    expect(result.eatenFoodIndices).toContain(0);
  });

  it('ignores food if too far', () => {
    const input = createInput({
      foodCount: 1,
      foodPositions: new Float32Array([100, 0, 0]), // Far away
      positions: new Float32Array([0, 0, 0]),
    });

    const result = simulateStep(input);
    // Should not steer towards it explicitly (steering might be 0 or small noise from bounds if applicable)
    // Here bounds are 100, fish at 0. Bounds force is 0.
    expect(result.steering[0]).toBe(0);
  });
});
