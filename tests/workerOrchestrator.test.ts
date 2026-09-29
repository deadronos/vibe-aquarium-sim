import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerOrchestrator } from '../src/systems/boids/workerOrchestrator';
import type { BoidsWorkerResponse } from '../src/workers/boids/sharedBuffers';
import { createSimulationInput } from './support/simulationInput';

type PostedMessage = { message: unknown; transferables?: ArrayBuffer[] };

class MockWorker {
  static instances: MockWorker[] = [];
  static throwOnTransfer = false;
  static throwOnClone = false;
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
    if (!transferables && MockWorker.throwOnClone) {
      throw new Error('worker is unavailable');
    }
    this.posted.push({ message, transferables });
  }

  terminate() {
    this.terminated = true;
  }
}

describe('WorkerOrchestrator transport lifecycle', () => {
  const createInput = createSimulationInput;

  const setIsolation = (value: boolean | undefined) => {
    Object.defineProperty(globalThis, 'crossOriginIsolated', {
      configurable: true,
      value,
    });
  };

  beforeEach(() => {
    MockWorker.instances = [];
    MockWorker.throwOnTransfer = false;
    MockWorker.throwOnClone = false;
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

  it('keeps SharedArrayBuffer as the preferred transport on an isolated page', () => {
    setIsolation(true);
    const orchestrator = new WorkerOrchestrator();
    const worker = MockWorker.instances[0];

    expect(orchestrator.getTransportStatus().mode).toBe('shared');
    expect(orchestrator.submitJob(createInput())).toBe(true);
    expect(worker.posted).toHaveLength(2);
    expect((worker.posted[0].message as { type: string }).type).toBe('shared-buffers');
    expect((worker.posted[1].message as { type: string }).type).toBe('shared-job');

    orchestrator.dispose();
  });

  it('falls from shared transport to transfer after a shared worker error', () => {
    setIsolation(true);
    const orchestrator = new WorkerOrchestrator();
    const worker = MockWorker.instances[0];

    expect(orchestrator.submitJob(createInput())).toBe(true);
    worker.onerror?.(new ErrorEvent('error', { message: 'shared worker crashed' }));

    expect(orchestrator.getTransportStatus().mode).toBe('transfer');
    expect(orchestrator.submitJob(createInput({ snapshotRevision: 2 }))).toBe(true);
    expect(worker.posted.at(-1)?.transferables).toHaveLength(8);

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
    expect(orchestrator.submitJob(createInput({ snapshotRevision: 8 }))).toBe(false);

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

  it('falls back to a main-thread result when a cloned worker post fails', () => {
    MockWorker.throwOnTransfer = true;
    MockWorker.throwOnClone = true;
    const orchestrator = new WorkerOrchestrator();

    expect(orchestrator.submitJob(createInput())).toBe(true);
    expect(orchestrator.getTransportStatus().mode).toBe('main-thread');
    expect(orchestrator.isBusy()).toBe(false);
    expect(orchestrator.getPendingResult()).not.toBeNull();

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

  it('replaces an invalid detached slot when transport is toggled back on', () => {
    MockWorker.throwOnTransfer = true;
    const orchestrator = new WorkerOrchestrator();
    const worker = MockWorker.instances[0];

    expect(orchestrator.submitJob(createInput())).toBe(true);
    expect(orchestrator.getTransportStatus().mode).toBe('copy');
    worker.onmessage?.({
      data: {
        type: 'success',
        mode: 'copy',
        result: {
          snapshotRevision: 1,
          steering: new Float32Array(0),
          externalForces: new Float32Array(0),
          eatenFoodIndices: [],
        },
      },
    } as MessageEvent<BoidsWorkerResponse>);
    orchestrator.clearPendingResult();

    window.toggleBoidsWorker?.();
    window.toggleBoidsWorker?.();
    MockWorker.throwOnTransfer = false;

    expect(orchestrator.getTransportStatus().mode).toBe('transfer');
    expect(orchestrator.submitJob(createInput({ snapshotRevision: 2 }))).toBe(true);
    expect(worker.posted.at(-1)?.transferables).toHaveLength(8);

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

  it('degrades through the fallback chain in order: shared, transfer, copy, main-thread', () => {
    setIsolation(true);
    const orchestrator = new WorkerOrchestrator();
    const worker = MockWorker.instances[0];

    const modes = [orchestrator.getTransportStatus().mode];

    // Shared buffers, then a worker error drops the shared transport.
    expect(orchestrator.submitJob(createInput({ snapshotRevision: 1 }))).toBe(true);
    worker.onerror?.(new ErrorEvent('error', { message: 'shared crashed' }));
    modes.push(orchestrator.getTransportStatus().mode);

    // Transferable in flight, then a worker error invalidates the active slot.
    expect(orchestrator.submitJob(createInput({ snapshotRevision: 2 }))).toBe(true);
    worker.onerror?.(new ErrorEvent('error', { message: 'transfer crashed' }));
    modes.push(orchestrator.getTransportStatus().mode);

    // Cloned messages, then a post failure retires the worker entirely.
    MockWorker.throwOnClone = true;
    expect(orchestrator.submitJob(createInput({ snapshotRevision: 3 }))).toBe(true);
    modes.push(orchestrator.getTransportStatus().mode);

    expect(modes).toEqual(['shared', 'transfer', 'copy', 'main-thread']);
    expect(worker.terminated).toBe(true);
    expect(orchestrator.getPendingResult()).not.toBeNull();

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
