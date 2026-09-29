import type { SimulationInput } from '../../src/workers/boids/types';

export function createSimulationInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  const fishCount = overrides.fishCount ?? 2;
  const foodCount = overrides.foodCount ?? 1;

  return {
    snapshotRevision: 1,
    fishCount,
    positions: new Float32Array(fishCount * 3),
    velocities: new Float32Array(fishCount * 3),
    speciesIndices: new Int32Array(fishCount),
    species: [
      {
        maxSpeed: 5,
        maxForce: 0.1,
        neighborDist: 10,
        separationDist: 5,
        weights: { separation: 2, alignment: 1, cohesion: 1 },
      },
    ],
    foodCount,
    foodPositions: new Float32Array(foodCount * 3),
    time: 0,
    boids: { neighborDist: 10, separationDist: 5, maxSpeed: 5, maxForce: 0.1 },
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
}
