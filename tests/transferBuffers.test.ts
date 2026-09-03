import { describe, expect, it } from 'vitest';
import {
  copySimulationInputToTransfer,
  createTransferableSimulationBuffers,
  createTransferSimulationInput,
  createTransferSimulationOutput,
  createTransferSimulationOutputTarget,
  ensureTransferableSimulationBuffers,
  hydrateTransferableSimulationBuffers,
  markTransferSlotInFlight,
  markTransferSlotPendingResult,
  releaseTransferSlot,
  serializeTransferableSimulationBuffers,
  type TransferableSimulationJobMessage,
} from '../src/workers/boids/transferBuffers';
import type { SimulationInput } from '../src/workers/boids/types';

describe('transferable boids buffers', () => {
  const createInput = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
    const fishCount = overrides.fishCount ?? 2;
    const foodCount = overrides.foodCount ?? 1;

    return {
      snapshotRevision: 7,
      fishCount,
      positions: new Float32Array([1, 2, 3, 4, 5, 6]),
      velocities: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]),
      modelIndices: new Int32Array([2, 1]),
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
      foodPositions: new Float32Array([9, 8, 7]),
      time: 1.5,
      boids: { neighborDist: 10, separationDist: 5, maxSpeed: 5, maxForce: 0.1 },
      bounds: { x: 100, y: 50, z: 100 },
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

  it('copies a reusable simulation snapshot into owned transfer buffers', () => {
    const input = createInput();
    const buffers = createTransferableSimulationBuffers(input.fishCount, input.foodCount);

    copySimulationInputToTransfer(input, buffers);

    expect(buffers.positions).toBeInstanceOf(Float32Array);
    expect(buffers.positions.buffer).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(buffers.positions.subarray(0, 6))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(Array.from(buffers.velocities.subarray(0, 6))).toEqual(
      expect.arrayContaining([expect.closeTo(0.1), expect.closeTo(0.2), expect.closeTo(0.3), expect.closeTo(0.4), 0.5, expect.closeTo(0.6)])
    );
    expect(Array.from(buffers.modelIndices.subarray(0, 2))).toEqual([2, 1]);
    expect(Array.from(buffers.foodPositions.subarray(0, 3))).toEqual([9, 8, 7]);
    expect(buffers.eatenFoodCount[0]).toBe(0);
  });

  it('serializes and hydrates the same numeric storage without cloning', () => {
    const input = createInput();
    const buffers = createTransferableSimulationBuffers(input.fishCount, input.foodCount);
    copySimulationInputToTransfer(input, buffers);
    buffers.steering.set([10, 11, 12, 13, 14, 15]);
    buffers.externalForces.set([-1, -2, -3, -4, -5, -6]);
    buffers.eatenFoodIndices[0] = 0;
    buffers.eatenFoodCount[0] = 1;

    const { payload, transferables } = serializeTransferableSimulationBuffers(buffers);
    const hydrated = hydrateTransferableSimulationBuffers(payload);

    expect(transferables).toHaveLength(8);
    expect(hydrated.positions.buffer).toBe(payload.positions);
    expect(Array.from(hydrated.steering.subarray(0, 6))).toEqual([10, 11, 12, 13, 14, 15]);
    expect(Array.from(hydrated.externalForces.subarray(0, 6))).toEqual([-1, -2, -3, -4, -5, -6]);
    expect(Array.from(hydrated.eatenFoodIndices.subarray(0, 1))).toEqual([0]);
    expect(hydrated.eatenFoodCount[0]).toBe(1);
  });

  it('creates zero-copy input and output views for a worker job', () => {
    const input = createInput();
    const buffers = createTransferableSimulationBuffers(input.fishCount, input.foodCount);
    copySimulationInputToTransfer(input, buffers);
    const { payload } = serializeTransferableSimulationBuffers(buffers);
    const message: TransferableSimulationJobMessage = {
      type: 'transfer-job',
      payload,
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

    const workerInput = createTransferSimulationInput(message, buffers);
    const outputTarget = createTransferSimulationOutputTarget(buffers, input.fishCount, input.foodCount);
    outputTarget.steering[0] = 42;
    outputTarget.eatenFoodIndices[0] = 0;
    outputTarget.eatenFoodCount[0] = 1;
    const output = createTransferSimulationOutput(
      buffers,
      workerInput.snapshotRevision,
      workerInput.fishCount,
      outputTarget.eatenFoodCount[0]
    );

    expect(workerInput.positions.buffer).toBe(buffers.positions.buffer);
    expect(output.steering.buffer).toBe(buffers.steering.buffer);
    expect(Array.from(output.eatenFoodIndices)).toEqual([0]);
  });

  it('reuses capacity below the growth threshold and allocates above it', () => {
    const initial = ensureTransferableSimulationBuffers(null, 2, 1);
    const reused = ensureTransferableSimulationBuffers(initial, 1, 1);
    const grown = ensureTransferableSimulationBuffers(initial, 64, 12);

    expect(reused).toBe(initial);
    expect(grown).not.toBe(initial);
    expect(grown.fishCapacity).toBeGreaterThanOrEqual(64);
    expect(grown.foodCapacity).toBeGreaterThanOrEqual(12);
  });

  it('enforces free to in-flight to pending-result to free ownership', () => {
    const slot = createTransferableSimulationBuffers(2, 1);

    expect(slot.state).toBe('free');
    expect(markTransferSlotInFlight(slot, 7)).toBe(true);
    expect(slot.state).toBe('in-flight');
    expect(markTransferSlotInFlight(slot, 8)).toBe(false);
    expect(markTransferSlotPendingResult(slot, 7)).toBe(true);
    expect(slot.state).toBe('pending-result');
    expect(releaseTransferSlot(slot)).toBe(true);
    expect(slot.state).toBe('free');
    expect(releaseTransferSlot(slot)).toBe(false);
  });
});
