import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerOrchestrator } from '../src/systems/boids/workerOrchestrator';
import type { BoidsWorkerResponse } from '../src/workers/boids/sharedBuffers';
import type { SimulationInput } from '../src/workers/boids/types';

type PostedMessage = { message: unknown; transferables?: ArrayBuffer[] };

class MockWorker {
  static instances: MockWorker[] = [];
  static throwOnTransfer = false;
  onmessage: ((event: MessageEvent<BoidsWorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly posted: PostedMessage[] = [];
  terminated = false;

  constructor(url: URL, options?: WorkerOptions) {
    void url;
    void options;
    MockWorker.instances.push(this);
  }

  postMessage(message: unknown, transferables?: ArrayBuffer[]) {
    if (transferables && MockWorker.throwOnTransfer) {
      throw new Error('transfer list rejected');
    }
    this.posted.push({ message, transferables });
  }

  terminate() {
    this.terminated = true;
  }
}

describe('WorkerOrchestrator transport lifecycle', () => {
  const createInput = (overrides: Partial<SimulationInput> = {}): SimulationInput => {
    const fishCount = overrides.fishCount ?? 2;
    const foodCount = overrides.foodCount ?? 1;
    return {
      snapshotRevision: 1,
      fishCount,
      positions: new Float32Array(fishCount * 3),
      velocities: new Float32Array(fishCount * 3),
      modelIndices: new Int32Array(fishCount),
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
  };

  const setIsolation = (value: boolean | undefined) => {
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      configurable: true,
      value,
    });
  };

  beforeEach(() => {
    MockWorker.instances = [];
    MockWorker.throwOnTransfer = false;
    vi.stubGlobal('Worker', MockWorker);
    setIsolation(false);
    delete window.__vibe_transportStatus;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete window.__vibe_transportStatus;
  });

  it('selects transferable buffers for a non-isolated worker page', () => {
    const orchestrator = new WorkerOrchestrator();

    expect(orchestrator.getTransportStatus().mode).toBe('transfer');
    expect(window.__vibe_transportStatus?.mode).toBe('transfer');

    orchestrator.dispose();
  });

  it('posts a transfer list and releases the returned slot only after clearing the result', () => {
    const orchestrator = new WorkerOrchestrator();
    const worker = MockWorker.instances[0];
    const input = createInput({ snapshotRevision: 7 });

    expect(orchestrator.submitJob(input)).toBe(true);
    expect(worker.posted).toHaveLength(1);
    expect(worker.posted[0].transferables).toHaveLength(8);
    expect(orchestrator.isBusy()).toBe(true);

    const message = worker.posted[0].message as {
      payload: Record<string, ArrayBuffer>;
      snapshotRevision: number;
      fishCount: number;
      foodCount: number;
    };
    const steering = new Float32Array(message.payload.steering);
    const externalForces = new Float32Array(message.payload.externalForces);
    const eatenFoodIndices = new Int32Array(message.payload.eatenFoodIndices);
    const eatenFoodCount = new Int32Array(message.payload.eatenFoodCount);
    steering[0] = 4;
    externalForces[0] = -2;
    eatenFoodIndices[0] = 0;
    eatenFoodCount[0] = 1;

    worker.onmessage?.({
      data: {
        type: 'success',
        mode: 'transfer',
        payload: message.payload,
        snapshotRevision: message.snapshotRevision,
        fishCount: message.fishCount,
        foodCount: message.foodCount,
        eatenFoodCount: 1,
      },
    } as MessageEvent<BoidsWorkerResponse>);

    expect(orchestrator.isBusy()).toBe(false);
    expect(orchestrator.getPendingResult()?.result.steering[0]).toBe(4);
    expect(orchestrator.getTransportStatus().completed).toBe(1);

    orchestrator.clearPendingResult();
    expect(orchestrator.getPendingResult()).toBeNull();
    expect(orchestrator.submitJob(createInput({ snapshotRevision: 8 }))).toBe(true);
    expect(worker.posted).toHaveLength(2);

    orchestrator.dispose();
  });

  it('falls back to cloned worker messages when transfer posting fails', () => {
    MockWorker.throwOnTransfer = true;
    const orchestrator = new WorkerOrchestrator();
    const worker = MockWorker.instances[0];

    expect(orchestrator.submitJob(createInput())).toBe(true);
    expect(worker.posted).toHaveLength(1);
    expect(worker.posted[0].transferables).toBeUndefined();
    expect(orchestrator.getTransportStatus().mode).toBe('copy');
    expect(orchestrator.getTransportStatus().errors).toBe(1);

    orchestrator.dispose();
  });

  it('invalidates a detached slot after a worker error and uses copy on the next job', () => {
    const orchestrator = new WorkerOrchestrator();
    const worker = MockWorker.instances[0];

    expect(orchestrator.submitJob(createInput())).toBe(true);
    worker.onerror?.(new ErrorEvent('error', { message: 'worker crashed' }));

    expect(orchestrator.isBusy()).toBe(false);
    expect(orchestrator.getTransportStatus().mode).toBe('copy');
    expect(orchestrator.getTransportStatus().latestReason).toMatch(/worker crashed/);

    expect(orchestrator.submitJob(createInput({ snapshotRevision: 2 }))).toBe(true);
    expect(worker.posted.at(-1)?.transferables).toBeUndefined();

    orchestrator.dispose();
  });

  it('rejects overlapping submissions while one transfer job is in flight', () => {
    const orchestrator = new WorkerOrchestrator();
    const worker = MockWorker.instances[0];

    expect(orchestrator.submitJob(createInput())).toBe(true);
    expect(orchestrator.submitJob(createInput({ snapshotRevision: 2 }))).toBe(false);
    expect(worker.posted).toHaveLength(1);
    expect(orchestrator.getTransportStatus().overlapCount).toBe(1);

    orchestrator.dispose();
  });

  it('uses main-thread simulation when workers are unavailable', () => {
    vi.stubGlobal('Worker', undefined);
    const orchestrator = new WorkerOrchestrator();

    expect(orchestrator.getTransportStatus().mode).toBe('main-thread');
    expect(orchestrator.submitJob(createInput())).toBe(true);
    expect(orchestrator.isBusy()).toBe(false);
    expect(orchestrator.getPendingResult()).not.toBeNull();

    orchestrator.dispose();
  });
});
