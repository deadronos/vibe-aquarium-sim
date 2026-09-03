import { describe, expect, it } from 'vitest';
import { simulateStep } from '../src/workers/boids/index';
import {
  createTransferableSimulationBuffers,
  createTransferSimulationInput,
  createTransferSimulationOutput,
  createTransferSimulationOutputTarget,
  copySimulationInputToTransfer,
  hydrateTransferableSimulationBuffers,
  serializeTransferableSimulationBuffers,
  type TransferableSimulationJobMessage,
} from '../src/workers/boids/transferBuffers';
import {
  isClonedSimulationSuccessMessage,
  isSharedSimulationJobMessage,
  isTransferSimulationJobMessage,
  isTransferSimulationSuccessMessage,
  type BoidsWorkerResponse,
} from '../src/workers/boids/sharedBuffers';
import type { SimulationInput } from '../src/workers/boids/types';

describe('transferable boids worker protocol', () => {
  const createInput = (): SimulationInput => ({
    snapshotRevision: 12,
    fishCount: 1,
    positions: new Float32Array([0, 0, 0]),
    velocities: new Float32Array([10, 0, 0]),
    modelIndices: new Int32Array([0]),
    species: [
      {
        maxSpeed: 5,
        maxForce: 0.1,
        neighborDist: 10,
        separationDist: 5,
        weights: { separation: 2, alignment: 1, cohesion: 1 },
      },
    ],
    foodCount: 1,
    foodPositions: new Float32Array([0.05, 0, 0]),
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

  it('runs a transfer job against returned output views without cloning', () => {
    const input = createInput();
    const hostBuffers = createTransferableSimulationBuffers(input.fishCount, input.foodCount);
    copySimulationInputToTransfer(input, hostBuffers);
    const { payload } = serializeTransferableSimulationBuffers(hostBuffers);
    const job: TransferableSimulationJobMessage = {
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

    const workerBuffers = hydrateTransferableSimulationBuffers(job.payload);
    const workerInput = createTransferSimulationInput(job, workerBuffers);
    const target = createTransferSimulationOutputTarget(
      workerBuffers,
      job.fishCount,
      job.foodCount
    );
    const result = simulateStep(workerInput, target);
    const response: BoidsWorkerResponse = {
      type: 'success',
      mode: 'transfer',
      payload: serializeTransferableSimulationBuffers(workerBuffers).payload,
      snapshotRevision: job.snapshotRevision,
      fishCount: job.fishCount,
      foodCount: job.foodCount,
      eatenFoodCount: result.eatenFoodIndices.length,
    };

    const returnedBuffers = hydrateTransferableSimulationBuffers(response.payload);
    const output = createTransferSimulationOutput(
      returnedBuffers,
      response.snapshotRevision,
      response.fishCount,
      response.eatenFoodCount
    );

    expect(response.mode).toBe('transfer');
    expect(output.steering.buffer).toBe(response.payload.steering);
    expect(output.externalForces[0]).toBeLessThan(0);
    expect(Array.from(output.eatenFoodIndices)).toEqual([0]);
  });

  it('discriminates transfer, shared, and cloned worker messages', () => {
    const input = createInput();
    const buffers = createTransferableSimulationBuffers(input.fishCount, input.foodCount);
    const { payload } = serializeTransferableSimulationBuffers(buffers);
    const transferJob: TransferableSimulationJobMessage = {
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
    const sharedJob = {
      type: 'shared-job' as const,
      snapshotRevision: 1,
      fishCount: 0,
      foodCount: 0,
      time: 0,
      species: input.species,
      boids: input.boids,
      bounds: input.bounds,
      water: input.water,
      current: input.current,
    };
    const transferSuccess: BoidsWorkerResponse = {
      type: 'success',
      mode: 'transfer',
      payload,
      snapshotRevision: 1,
      fishCount: 0,
      foodCount: 0,
      eatenFoodCount: 0,
    };
    const clonedSuccess: BoidsWorkerResponse = {
      type: 'success',
      mode: 'copy',
      result: {
        snapshotRevision: 1,
        steering: new Float32Array(0),
        externalForces: new Float32Array(0),
        eatenFoodIndices: [],
      },
    };

    expect(isTransferSimulationJobMessage(transferJob)).toBe(true);
    expect(isSharedSimulationJobMessage(transferJob)).toBe(false);
    expect(isSharedSimulationJobMessage(sharedJob)).toBe(true);
    expect(isTransferSimulationSuccessMessage(transferSuccess)).toBe(true);
    expect(isClonedSimulationSuccessMessage(transferSuccess)).toBe(false);
    expect(isClonedSimulationSuccessMessage(clonedSuccess)).toBe(true);
  });
});
