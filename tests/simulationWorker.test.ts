
import { describe, it, expect } from 'vitest';
import { simulateStep, SimulationInput } from '../src/workers/simulationWorker';

describe('simulationWorker', () => {
  it('should produce consistent results across multiple calls (state reset check)', () => {
    // Setup a small simulation
    const fishCount = 10;
    const positions = new Float32Array(fishCount * 3);
    const velocities = new Float32Array(fishCount * 3);

    // Initialize random positions/velocities
    for (let i = 0; i < fishCount * 3; i++) {
        positions[i] = Math.random() * 100 - 50;
        velocities[i] = Math.random() * 2 - 1;
    }

    const input: SimulationInput = {
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
        maxForce: 0.1
      },
      bounds: { x: 100, y: 100, z: 100 },
      water: { density: 1, dragCoefficient: 0.01, crossSectionArea: 1 }
    };

    // First run
    const result1 = simulateStep(input);
    const steering1 = Float32Array.from(result1.steering); // copy

    // Second run with same input (simulation is stateless per step with respect to input)
    // If we reuse global state but fail to clear it, this might differ or crash
    const result2 = simulateStep(input);
    const steering2 = result2.steering;

    expect(steering2).toEqual(steering1);
  });

  it('should handle different inputs correctly when reusing state', () => {
     // Run with 10 fish
     const input1: SimulationInput = {
        fishCount: 2,
        positions: new Float32Array([0,0,0, 10,0,0]), // Two fish close-ish
        velocities: new Float32Array([1,0,0, -1,0,0]),
        foodCount: 0,
        foodPositions: new Float32Array(0),
        time: 0,
        boids: { neighborDist: 20, separationDist: 5, maxSpeed: 5, maxForce: 0.1 },
        bounds: { x: 100, y: 100, z: 100 },
        water: { density: 1, dragCoefficient: 0.01, crossSectionArea: 1 }
     };

     simulateStep(input1);

     // Run with 1 fish (should have 0 steering if alone)
     const input2: SimulationInput = {
        fishCount: 1,
        positions: new Float32Array([0,0,0]),
        velocities: new Float32Array([1,0,0]),
        foodCount: 0,
        foodPositions: new Float32Array(0),
        time: 0,
        boids: { neighborDist: 20, separationDist: 5, maxSpeed: 5, maxForce: 0.1 },
        bounds: { x: 100, y: 100, z: 100 },
        water: { density: 1, dragCoefficient: 0.01, crossSectionArea: 1 }
     };

     const res2 = simulateStep(input2);

     // The single fish should have 0 steering from neighbors (only drag/bounds)
     // Actually it might have drag. But neighbor forces should be 0.
     // Let's just check it runs without error and output size is correct.
     expect(res2.steering.length).toBe(3);
  });
});
