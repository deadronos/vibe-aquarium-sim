import { describe, expect, it } from 'vitest';
import {
  copySimulationInputToTransfer,
  createTransferableSimulationBuffers,
  serializeTransferableSimulationBuffers,
} from '../src/workers/boids/transferBuffers';
import type { SimulationInput } from '../src/workers/boids/types';

describe('boids worker transport benchmark', () => {
  const createInput = (fishCount: number): SimulationInput => ({
    snapshotRevision: 1,
    fishCount,
    positions: Float32Array.from({ length: fishCount * 3 }, (_, index) => index % 17),
    velocities: Float32Array.from({ length: fishCount * 3 }, (_, index) => (index % 11) / 10),
    modelIndices: Int32Array.from({ length: fishCount }, (_, index) => index % 3),
    species: [
      {
        maxSpeed: 5,
        maxForce: 0.1,
        neighborDist: 10,
        separationDist: 5,
        weights: { separation: 2, alignment: 1, cohesion: 1 },
      },
    ],
    foodCount: 16,
    foodPositions: new Float32Array(16 * 3),
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
  });

  it('logs synthetic clone preparation versus transferable packing at supported scales', () => {
    const iterations = 50;
    const counts = [100, 1000, 5000];

    for (const fishCount of counts) {
      const input = createInput(fishCount);
      const buffers = createTransferableSimulationBuffers(fishCount, input.foodCount);

      for (let i = 0; i < 5; i += 1) {
        structuredClone(input);
        copySimulationInputToTransfer(input, buffers);
        serializeTransferableSimulationBuffers(buffers);
      }

      const cloneStart = performance.now();
      for (let i = 0; i < iterations; i += 1) structuredClone(input);
      const cloneDuration = performance.now() - cloneStart;

      const transferStart = performance.now();
      for (let i = 0; i < iterations; i += 1) {
        copySimulationInputToTransfer(input, buffers);
        serializeTransferableSimulationBuffers(buffers);
      }
      const transferDuration = performance.now() - transferStart;

      expect(Number.isFinite(cloneDuration)).toBe(true);
      expect(Number.isFinite(transferDuration)).toBe(true);
      console.log(
        `BENCHMARK: boids transport ${fishCount} fish, ${iterations} iterations — ` +
          `clone ${(cloneDuration / iterations).toFixed(3)}ms avg, ` +
          `transfer ${(transferDuration / iterations).toFixed(3)}ms avg`
      );
    }
  });
});
