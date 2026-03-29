import { describe, expect, it } from 'vitest';
import { simulateStep } from '../src/workers/boids/index';
import {
  copySimulationInputToShared,
  createSharedSimulationBuffers,
  createSharedSimulationInput,
  createSharedSimulationOutput,
  createSharedSimulationOutputTarget,
  ensureSharedSimulationBuffers,
  supportsSharedSimulationBuffers,
  type SharedSimulationJobMessage,
} from '../src/workers/boids/sharedBuffers';
import type { SimulationInput } from '../src/workers/boids/types';

describe('shared boids buffers', () => {
  const createInput = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
    const fishCount = overrides.fishCount ?? 1;
    const positions = overrides.positions ?? new Float32Array(fishCount * 3);
    const velocities = overrides.velocities ?? new Float32Array(fishCount * 3);
    const modelIndices = overrides.modelIndices ?? new Int32Array(fishCount);
    const foodCount = overrides.foodCount ?? 0;
    const foodPositions = overrides.foodPositions ?? new Float32Array(foodCount * 3);

    return {
      snapshotRevision: overrides.snapshotRevision ?? 1,
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
    };
  };

  it('detects when shared buffers are supported', () => {
    expect(
      supportsSharedSimulationBuffers({
        SharedArrayBuffer,
        crossOriginIsolated: true,
      })
    ).toBe(true);

    expect(
      supportsSharedSimulationBuffers({
        SharedArrayBuffer,
        crossOriginIsolated: false,
      })
    ).toBe(false);

    expect(supportsSharedSimulationBuffers({ crossOriginIsolated: true })).toBe(false);
  });

  it('allocates and grows SharedArrayBuffer-backed views', () => {
    const initial = ensureSharedSimulationBuffers(null, 2, 1);

    expect(initial.positions.buffer).toBeInstanceOf(SharedArrayBuffer);
    expect(initial.fishCapacity).toBeGreaterThanOrEqual(2);
    expect(initial.foodCapacity).toBeGreaterThanOrEqual(1);

    const reused = ensureSharedSimulationBuffers(initial, 1, 1);
    expect(reused).toBe(initial);

    const grown = ensureSharedSimulationBuffers(initial, 64, 12);
    expect(grown).not.toBe(initial);
    expect(grown.fishCapacity).toBeGreaterThanOrEqual(64);
    expect(grown.foodCapacity).toBeGreaterThanOrEqual(12);
  });

  it('copies simulation snapshots into shared buffers and rebuilds results without cloning', () => {
    const input = createInput({
      snapshotRevision: 7,
      fishCount: 2,
      positions: new Float32Array([1, 2, 3, 4, 5, 6]),
      velocities: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]),
      modelIndices: new Int32Array([0, 0]),
      foodCount: 1,
      foodPositions: new Float32Array([9, 8, 7]),
    });
    const buffers = createSharedSimulationBuffers(input.fishCount, input.foodCount);

    copySimulationInputToShared(input, buffers);
    expect(Array.from(buffers.positions.subarray(0, 6))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(Array.from(buffers.foodPositions.subarray(0, 3))).toEqual([9, 8, 7]);

    buffers.steering.set([10, 11, 12, 13, 14, 15], 0);
    buffers.externalForces.set([-1, -2, -3, -4, -5, -6], 0);
    buffers.eatenFoodIndices[0] = 0;
    buffers.eatenFoodCount[0] = 1;

    const output = createSharedSimulationOutput(
      buffers,
      input.snapshotRevision,
      input.fishCount,
      buffers.eatenFoodCount[0]
    );

    expect(output.snapshotRevision).toBe(7);
    expect(output.steering.buffer).toBe(buffers.steering.buffer);
    expect(Array.from(output.externalForces)).toEqual([-1, -2, -3, -4, -5, -6]);
    expect(Array.from(output.eatenFoodIndices)).toEqual([0]);
  });

  it('writes simulation results directly into shared output views', () => {
    const input = createInput({
      fishCount: 1,
      positions: new Float32Array([0, 0, 0]),
      velocities: new Float32Array([10, 0, 0]),
      foodCount: 1,
      foodPositions: new Float32Array([0.05, 0, 0]),
    });
    const buffers = createSharedSimulationBuffers(input.fishCount, input.foodCount);
    const sharedJob: SharedSimulationJobMessage = {
      type: 'shared-job',
      snapshotRevision: input.snapshotRevision,
      fishCount: input.fishCount,
      foodCount: input.foodCount,
      time: input.time,
      species: input.species,
      boids: input.boids,
      bounds: input.bounds,
      water: input.water,
      current: input.current,
    };

    copySimulationInputToShared(input, buffers);
    const result = simulateStep(
      createSharedSimulationInput(sharedJob, buffers),
      createSharedSimulationOutputTarget(buffers, input.fishCount, input.foodCount)
    );

    expect(result.steering.buffer).toBe(buffers.steering.buffer);
    expect(result.externalForces.buffer).toBe(buffers.externalForces.buffer);
    expect(result.externalForces[0]).toBeLessThan(0);
    expect(Array.from(result.eatenFoodIndices)).toEqual([0]);
  });
});
