import { describe, expect, it } from 'vitest';
import {
  assertCapacity,
  copySimulationInputInto,
  createFloat32,
  createInt32,
  createSimulationInputFromJob,
  createSimulationOutputFrom,
  createSimulationOutputTargetFrom,
  nextCapacity,
} from '../src/workers/boids/simulationBuffers';
import type { SimulationInput } from '../src/workers/boids/types';

type Storage = {
  fishCapacity: number;
  foodCapacity: number;
  positions: Float32Array<ArrayBuffer>;
  velocities: Float32Array<ArrayBuffer>;
  speciesIndices: Int32Array<ArrayBuffer>;
  foodPositions: Float32Array<ArrayBuffer>;
  steering: Float32Array<ArrayBuffer>;
  externalForces: Float32Array<ArrayBuffer>;
  eatenFoodIndices: Int32Array<ArrayBuffer>;
  eatenFoodCount: Int32Array<ArrayBuffer>;
};

const createStorage = (fishCapacity: number, foodCapacity: number): Storage => ({
  fishCapacity,
  foodCapacity,
  positions: createFloat32(fishCapacity * 3),
  velocities: createFloat32(fishCapacity * 3),
  speciesIndices: createInt32(fishCapacity),
  foodPositions: createFloat32(foodCapacity * 3),
  steering: createFloat32(fishCapacity * 3),
  externalForces: createFloat32(fishCapacity * 3),
  eatenFoodIndices: createInt32(foodCapacity),
  eatenFoodCount: createInt32(1),
});

const createInput = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
  const fishCount = overrides.fishCount ?? 2;
  const foodCount = overrides.foodCount ?? 1;

  return {
    snapshotRevision: 5,
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
    time: 1,
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
};

describe('generic simulation buffer codec', () => {
  it('grows requested capacity by 1.5x while respecting the minimum', () => {
    expect(nextCapacity(40, 16)).toBe(60);
    expect(nextCapacity(64, 16)).toBe(96);
    expect(nextCapacity(1, 16)).toBe(16);
    expect(nextCapacity(1, 8)).toBe(8);
  });

  it('copies exactly fishCount * 3 floats and leaves trailing slots untouched', () => {
    const storage = createStorage(4, 2);
    const input = createInput({
      fishCount: 2,
      positions: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      velocities: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]),
      speciesIndices: new Int32Array([0, 0, 0]),
      foodCount: 1,
      foodPositions: new Float32Array([9, 8, 7, 6, 5, 4]),
    });

    copySimulationInputInto(input, storage);

    expect(Array.from(storage.positions.subarray(0, 6))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(storage.positions[6]).toBe(0);
    expect(Array.from(storage.velocities.subarray(0, 6))).toEqual(
      expect.arrayContaining([
        expect.closeTo(0.1),
        expect.closeTo(0.2),
        expect.closeTo(0.3),
        expect.closeTo(0.4),
        0.5,
        expect.closeTo(0.6),
      ])
    );
    expect(storage.velocities[6]).toBe(0);
    expect(Array.from(storage.speciesIndices.subarray(0, 2))).toEqual([0, 0]);
    expect(storage.speciesIndices[2]).toBe(0);
    expect(Array.from(storage.foodPositions.subarray(0, 3))).toEqual([9, 8, 7]);
    expect(storage.foodPositions[3]).toBe(0);
    expect(storage.eatenFoodCount[0]).toBe(0);
  });

  it('throws when the requested job exceeds capacity', () => {
    const storage = createStorage(2, 1);

    expect(() => assertCapacity(3, 1, storage, 'Shared')).toThrow(
      'Shared boids buffer capacity is too small for the submitted job.'
    );
    expect(() => assertCapacity(2, 2, storage, 'Transferable')).toThrow(
      'Transferable boids buffer capacity is too small for the submitted job.'
    );
    expect(() => assertCapacity(2, 1, storage, 'Shared')).not.toThrow();
  });

  it('rebuilds zero-copy input views for a submitted job', () => {
    const storage = createStorage(4, 2);
    const input = createInput({ fishCount: 2, foodCount: 1 });

    copySimulationInputInto(input, storage);

    const jobInput = createSimulationInputFromJob(
      {
        snapshotRevision: 5,
        fishCount: 2,
        foodCount: 1,
        time: 1,
        species: input.species,
        boids: input.boids,
        bounds: input.bounds,
        water: input.water,
        current: input.current,
      },
      storage
    );

    expect(jobInput.positions.buffer).toBe(storage.positions.buffer);
    expect(jobInput.velocities.buffer).toBe(storage.velocities.buffer);
    expect(jobInput.speciesIndices.buffer).toBe(storage.speciesIndices.buffer);
    expect(jobInput.foodPositions.buffer).toBe(storage.foodPositions.buffer);
    expect(jobInput.positions.length).toBe(6);
    expect(jobInput.speciesIndices.length).toBe(2);
    expect(jobInput.foodPositions.length).toBe(3);
  });

  it('creates zero-copy output views and rejects over-capacity completions', () => {
    const storage = createStorage(4, 2);

    const target = createSimulationOutputTargetFrom(storage, 2, 1, 'Shared');
    expect(target.steering.buffer).toBe(storage.steering.buffer);
    expect(target.externalForces.buffer).toBe(storage.externalForces.buffer);
    expect(target.eatenFoodIndices.buffer).toBe(storage.eatenFoodIndices.buffer);
    expect(target.eatenFoodCount).toBe(storage.eatenFoodCount);

    expect(() => createSimulationOutputTargetFrom(storage, 5, 1, 'Shared')).toThrow(
      'Shared boids buffer capacity is too small for the completed job.'
    );
  });

  it('clamps eaten food count to the food capacity when building an output', () => {
    const storage = createStorage(4, 4);
    storage.steering.set([1, 2, 3, 4, 5, 6]);
    storage.externalForces.set([-1, -2, -3, -4, -5, -6]);

    const clamped = createSimulationOutputFrom(storage, 5, 2, 99);
    expect(clamped.snapshotRevision).toBe(5);
    expect(clamped.steering.buffer).toBe(storage.steering.buffer);
    expect(Array.from(clamped.externalForces)).toEqual([-1, -2, -3, -4, -5, -6]);
    expect(clamped.eatenFoodIndices.length).toBe(4);

    const negative = createSimulationOutputFrom(storage, 5, 2, -3);
    expect(negative.eatenFoodIndices.length).toBe(0);

    storage.eatenFoodCount[0] = 3;
    const fromBuffer = createSimulationOutputFrom(storage, 5, 2);
    expect(fromBuffer.eatenFoodIndices.length).toBe(3);
  });
});
