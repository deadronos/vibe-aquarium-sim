import type { SimulationInput, SimulationOutput } from '../../workers/simulationWorker';
import { simulateStep } from '../../workers/simulationWorker';
import {
  copySimulationInputToShared,
  createSharedSimulationOutput,
  ensureSharedSimulationBuffers,
  serializeSharedSimulationBuffers,
  supportsSharedSimulationBuffers,
  type BoidsWorkerResponse,
  type SharedSimulationBuffers,
} from '../../workers/boids/sharedBuffers';
import {
  copySimulationInputToTransfer,
  createTransferSimulationOutput,
  ensureTransferableSimulationBuffers,
  hydrateTransferableSimulationBuffers,
  invalidateTransferSlot,
  markTransferSlotInFlight,
  markTransferSlotPendingResult,
  releaseTransferSlot,
  serializeTransferableSimulationBuffers,
  supportsTransferableSimulationBuffers,
  type TransferableSimulationBuffers,
  type TransferableSimulationJobMessage,
} from '../../workers/boids/transferBuffers';
import { disposeBoidsCache } from '../../workers/boids/cache';

type TransportMode = VibeTransportMode;

export class WorkerOrchestrator {
  private worker: Worker | null = null;
  private disposed = false;
  private useWorker = true;
  private hasJob = false;
  private pendingResult: SimulationOutput | null = null;
  private pendingFishCount = 0;
  private sharedBuffers: SharedSimulationBuffers | null = null;
  private transferSlots: Array<TransferableSimulationBuffers | null> = [null, null];
  private activeTransferSlotIndex: number | null = null;
  private pendingTransferSlotIndex: number | null = null;
  private readonly transportStatus: VibeTransportStatus = {
    mode: 'main-thread',
    isolationSupported: supportsSharedSimulationBuffers(),
    fishCapacity: 0,
    foodCapacity: 0,
    submitted: 0,
    completed: 0,
    errors: 0,
    overlapCount: 0,
    busy: false,
    latestReason: null,
  };

  constructor() {
    this.initWorker();

    // Expose toggle via window for testing.
    if (typeof window !== 'undefined') {
      window.toggleBoidsWorker = () => {
        this.useWorker = !this.useWorker;
        if (!this.useWorker) {
          this.setTransportMode('main-thread', 'worker disabled');
        } else if (this.worker) {
          this.setTransportMode(this.preferredWorkerMode(), 'worker enabled');
        }
      };
    }
  }

  private preferredWorkerMode(): TransportMode {
    if (this.transportStatus.isolationSupported) return 'shared';
    if (supportsTransferableSimulationBuffers()) return 'transfer';
    return 'copy';
  }

  private setTransportMode(mode: TransportMode, reason: string | null = null) {
    this.transportStatus.mode = mode;
    if (reason !== null) this.transportStatus.latestReason = reason;
    this.publishTransportStatus();
  }

  private publishTransportStatus() {
    this.transportStatus.busy = this.hasJob;
    if (typeof window !== 'undefined') {
      window.__vibe_transportStatus = this.transportStatus;
      if (window.__vibe_debug) window.__vibe_debug.transport = this.transportStatus;
    }
  }

  private recordError(reason: string) {
    this.transportStatus.errors += 1;
    this.transportStatus.latestReason = reason;
    this.publishTransportStatus();
  }

  private initWorker() {
    if (typeof Worker === 'undefined') {
      this.useWorker = false;
      this.setTransportMode('main-thread', 'Worker API unavailable');
      return;
    }

    try {
      this.worker = new Worker(new URL('../../workers/boids.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.setTransportMode(this.preferredWorkerMode(), 'worker ready');

      this.worker.onmessage = (event: MessageEvent<BoidsWorkerResponse>) => {
        if (this.disposed) return;
        const data = event.data;
        if (data.type === 'success') {
          if (data.mode === 'shared') {
            if (!this.sharedBuffers) {
              this.handleWorkerFailure('shared result arrived before buffers were ready');
              return;
            }
            this.pendingResult = createSharedSimulationOutput(
              this.sharedBuffers,
              data.snapshotRevision,
              this.pendingFishCount,
              data.eatenFoodCount
            );
          } else if (data.mode === 'transfer') {
            this.handleTransferSuccess(data);
            return;
          } else {
            this.pendingResult = data.result;
          }

          this.transportStatus.completed += 1;
          this.hasJob = false;
          this.publishTransportStatus();
        } else if (data.type === 'error') {
          this.handleWorkerFailure(data.error);
        }
      };

      this.worker.onerror = (error) => {
        this.handleWorkerFailure(error.message || 'worker error');
      };
    } catch (error) {
      this.useWorker = false;
      this.worker = null;
      this.recordError(error instanceof Error ? error.message : String(error));
      this.setTransportMode('main-thread', 'failed to create worker');
    }
  }

  private handleWorkerFailure(reason: string) {
    const activeIndex = this.activeTransferSlotIndex;
    if (activeIndex !== null) {
      const slot = this.transferSlots[activeIndex];
      if (slot) invalidateTransferSlot(slot);
      this.activeTransferSlotIndex = null;
      this.setTransportMode('copy', reason);
    }
    this.hasJob = false;
    this.recordError(reason);
  }

  private handleTransferSuccess(
    data: Extract<BoidsWorkerResponse, { type: 'success'; mode: 'transfer' }>
  ) {
    const activeIndex = this.activeTransferSlotIndex;
    const slot = activeIndex === null ? null : this.transferSlots[activeIndex];
    if (activeIndex === null || !slot || slot.state !== 'in-flight' || slot.jobRevision === null) {
      this.handleWorkerFailure('transfer result arrived without an active slot');
      return;
    }

    const jobRevision = slot.jobRevision;
    const hydrated = hydrateTransferableSimulationBuffers(data.payload);
    slot.positions = hydrated.positions;
    slot.velocities = hydrated.velocities;
    slot.modelIndices = hydrated.modelIndices;
    slot.foodPositions = hydrated.foodPositions;
    slot.steering = hydrated.steering;
    slot.externalForces = hydrated.externalForces;
    slot.eatenFoodIndices = hydrated.eatenFoodIndices;
    slot.eatenFoodCount = hydrated.eatenFoodCount;

    if (!markTransferSlotPendingResult(slot, jobRevision)) {
      invalidateTransferSlot(slot);
      this.handleWorkerFailure('transfer slot state changed before result hydration');
      return;
    }

    this.pendingTransferSlotIndex = activeIndex;
    this.activeTransferSlotIndex = null;
    this.pendingFishCount = data.fishCount;
    this.pendingResult = createTransferSimulationOutput(
      slot,
      data.snapshotRevision,
      data.fishCount,
      data.eatenFoodCount
    );
    this.hasJob = false;
    this.transportStatus.completed += 1;
    this.publishTransportStatus();
  }

  private findTransferSlot(fishCount: number, foodCount: number) {
    for (let index = 0; index < this.transferSlots.length; index += 1) {
      const slot = this.transferSlots[index];
      if (
        slot &&
        slot.state === 'free' &&
        slot.fishCapacity >= fishCount &&
        slot.foodCapacity >= foodCount
      ) {
        return index;
      }
    }

    for (let index = 0; index < this.transferSlots.length; index += 1) {
      const slot = this.transferSlots[index];
      if (!slot || slot.state === 'invalid' || slot.state === 'free') {
        this.transferSlots[index] = ensureTransferableSimulationBuffers(slot, fishCount, foodCount);
        const replacement = this.transferSlots[index];
        if (replacement) {
          this.transportStatus.fishCapacity = Math.max(
            this.transportStatus.fishCapacity,
            replacement.fishCapacity
          );
          this.transportStatus.foodCapacity = Math.max(
            this.transportStatus.foodCapacity,
            replacement.foodCapacity
          );
          this.publishTransportStatus();
        }
        return index;
      }
    }

    return null;
  }

  private submitSharedJob(input: SimulationInput) {
    if (!this.worker) return this.submitClonedJob(input);

    try {
      const nextBuffers = ensureSharedSimulationBuffers(
        this.sharedBuffers,
        input.fishCount,
        input.foodCount
      );

      if (nextBuffers !== this.sharedBuffers) {
        this.sharedBuffers = nextBuffers;
        this.transportStatus.fishCapacity = nextBuffers.fishCapacity;
        this.transportStatus.foodCapacity = nextBuffers.foodCapacity;
        this.worker.postMessage({
          type: 'shared-buffers',
          payload: serializeSharedSimulationBuffers(nextBuffers),
        });
      }

      if (!this.sharedBuffers) throw new Error('Shared boids buffers were not initialized.');
      copySimulationInputToShared(input, this.sharedBuffers);
      this.hasJob = true;
      this.worker.postMessage({
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
      });
      this.transportStatus.submitted += 1;
      this.publishTransportStatus();
      return true;
    } catch (error) {
      this.hasJob = false;
      this.sharedBuffers = null;
      this.recordError(error instanceof Error ? error.message : String(error));
      this.setTransportMode(
        supportsTransferableSimulationBuffers() ? 'transfer' : 'copy',
        'shared transport failed; falling back'
      );
      return this.submitTransferOrCopy(input);
    }
  }

  private submitTransferJob(input: SimulationInput) {
    if (!this.worker) return this.submitMainThreadJob(input);

    const slotIndex = this.findTransferSlot(input.fishCount, input.foodCount);
    if (slotIndex === null) {
      this.setTransportMode('copy', 'no free transfer slot');
      return this.submitClonedJob(input);
    }

    const slot = this.transferSlots[slotIndex];
    if (!slot) return this.submitClonedJob(input);

    copySimulationInputToTransfer(input, slot);
    const { payload, transferables } = serializeTransferableSimulationBuffers(slot);
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

    if (!markTransferSlotInFlight(slot, input.snapshotRevision)) {
      return this.submitClonedJob(input);
    }

    this.activeTransferSlotIndex = slotIndex;
    this.hasJob = true;
    try {
      this.worker.postMessage(message, transferables);
      this.transportStatus.submitted += 1;
      this.publishTransportStatus();
      return true;
    } catch (error) {
      invalidateTransferSlot(slot);
      this.activeTransferSlotIndex = null;
      this.hasJob = false;
      this.recordError(error instanceof Error ? error.message : String(error));
      this.setTransportMode('copy', 'transfer post failed; falling back to cloned messages');
      return this.submitClonedJob(input);
    }
  }

  private submitClonedJob(input: SimulationInput) {
    if (!this.worker) return this.submitMainThreadJob(input);

    this.hasJob = true;
    try {
      this.worker.postMessage(input);
      this.transportStatus.submitted += 1;
      this.publishTransportStatus();
      return true;
    } catch (error) {
      this.hasJob = false;
      this.recordError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  private submitTransferOrCopy(input: SimulationInput) {
    if (this.transportStatus.mode === 'transfer') return this.submitTransferJob(input);
    return this.submitClonedJob(input);
  }

  private submitMainThreadJob(input: SimulationInput) {
    try {
      const t0 = performance.now();
      this.pendingResult = simulateStep(input);
      const t1 = performance.now();
      try {
        const dbg = typeof window !== 'undefined' ? window.__vibe_debug : null;
        if (dbg) {
          dbg.simulateStep.push({
            duration: t1 - t0,
            time: Date.now(),
            fishCount: input.fishCount,
          });
        }
      } catch {
        /* ignore optional diagnostics */
      }
      this.transportStatus.submitted += 1;
      this.transportStatus.completed += 1;
      this.hasJob = false;
      this.publishTransportStatus();
      return true;
    } catch (error) {
      this.hasJob = false;
      this.recordError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  public getPendingResult() {
    const result = this.pendingResult;
    const count = this.pendingFishCount;
    return result ? { result, count } : null;
  }

  public clearPendingResult() {
    if (this.pendingTransferSlotIndex !== null) {
      const slot = this.transferSlots[this.pendingTransferSlotIndex];
      if (slot) {
        releaseTransferSlot(slot);
      }
      this.pendingTransferSlotIndex = null;
    }
    this.pendingResult = null;
    this.pendingFishCount = 0;
    this.publishTransportStatus();
  }

  public isBusy() {
    return this.hasJob;
  }

  public getTransportStatus() {
    return this.transportStatus;
  }

  public submitJob(input: SimulationInput) {
    if (this.disposed) return false;
    if (this.hasJob || this.pendingResult) {
      this.transportStatus.overlapCount += 1;
      this.publishTransportStatus();
      return false;
    }

    this.pendingFishCount = input.fishCount;
    if (this.useWorker && this.worker) {
      if (this.transportStatus.mode === 'shared') return this.submitSharedJob(input);
      if (this.transportStatus.mode === 'transfer') return this.submitTransferJob(input);
      return this.submitClonedJob(input);
    }

    this.setTransportMode('main-thread');
    return this.submitMainThreadJob(input);
  }

  public dispose() {
    this.disposed = true;
    disposeBoidsCache();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.hasJob = false;
    this.publishTransportStatus();
  }
}
