import type { SimulationInput, SimulationOutput } from '../../workers/boids/types';
import {
  supportsSharedSimulationBuffers,
  type BoidsWorkerResponse,
} from '../../workers/boids/sharedBuffers';
import { supportsTransferableSimulationBuffers } from '../../workers/boids/transferBuffers';
import { disposeBoidsCache } from '../../workers/boids/cache';
import {
  createTransportStatus,
  publishTransportStatus as publishStatus,
  recordTransportError,
} from './transportStatus';
import { runMainThreadStep } from './mainThreadTransport';
import { createSharedTransport, type SharedTransport } from './sharedTransport';
import { createTransferTransport, type TransferTransport } from './transferTransport';
import type { TransportHost } from './transportHost';

type TransportMode = VibeTransportMode;

/**
 * Routes boids jobs over the best available transport and owns the fallback
 * chain between them: shared -> transfer -> cloned -> main thread.
 *
 * The shared-buffer and transferable transports own their own buffer/slot
 * state in `sharedTransport.ts` / `transferTransport.ts`; this class keeps the
 * worker handle, the job slot, and every mode transition.
 */
export class WorkerOrchestrator {
  private worker: Worker | null = null;
  private disposed = false;
  private useWorker = true;
  private hasJob = false;
  private pendingResult: SimulationOutput | null = null;
  private pendingFishCount = 0;
  private readonly transportStatus: VibeTransportStatus = createTransportStatus(
    supportsSharedSimulationBuffers()
  );
  private readonly sharedTransport: SharedTransport;
  private readonly transferTransport: TransferTransport;

  constructor() {
    const readWorker = () => this.worker;
    const host: TransportHost = {
      get worker() {
        return readWorker();
      },
      status: this.transportStatus,
      publishStatus: () => this.publishTransportStatus(),
      setBusy: (busy) => {
        this.hasJob = busy;
      },
      setMode: (mode, reason = null) => this.setTransportMode(mode, reason),
      recordError: (reason) => this.recordError(reason),
      setPendingResult: (result, fishCount) => {
        this.pendingResult = result;
        this.pendingFishCount = fishCount;
      },
      handleWorkerFailure: (reason) => this.handleWorkerFailure(reason),
      submitClonedJob: (input) => this.submitClonedJob(input),
      submitMainThreadJob: (input) => this.submitMainThreadJob(input),
      submitTransferOrCopy: (input) => this.submitTransferOrCopy(input),
    };

    this.sharedTransport = createSharedTransport(host);
    this.transferTransport = createTransferTransport(host);

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
    publishStatus(this.transportStatus, this.hasJob);
  }

  private recordError(reason: string) {
    recordTransportError(this.transportStatus, this.hasJob, reason);
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
            const output = this.sharedTransport.takeOutput(
              data.snapshotRevision,
              data.eatenFoodCount,
              this.pendingFishCount
            );
            if (!output) {
              this.handleWorkerFailure('shared result arrived before buffers were ready');
              return;
            }
            this.pendingResult = output;
          } else if (data.mode === 'transfer') {
            this.transferTransport.handleSuccess(data);
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
    if (this.transferTransport.invalidateActiveSlot()) {
      this.setTransportMode('copy', reason);
    } else if (this.transportStatus.mode === 'shared') {
      this.sharedTransport.invalidate();
      this.setTransportMode(supportsTransferableSimulationBuffers() ? 'transfer' : 'copy', reason);
    }
    this.hasJob = false;
    this.recordError(reason);
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
      const reason = error instanceof Error ? error.message : String(error);
      this.worker.terminate();
      this.worker = null;
      this.useWorker = false;
      this.setTransportMode(
        'main-thread',
        'cloned worker post failed; falling back to main thread'
      );
      this.recordError(reason);
      return this.submitMainThreadJob(input);
    }
  }

  private submitTransferOrCopy(input: SimulationInput) {
    if (this.transportStatus.mode === 'transfer') return this.transferTransport.submit(input);
    return this.submitClonedJob(input);
  }

  private submitMainThreadJob(input: SimulationInput) {
    try {
      this.pendingResult = runMainThreadStep(input);
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
    this.transferTransport.releasePendingSlot();
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
      if (this.transportStatus.mode === 'shared') return this.sharedTransport.submit(input);
      if (this.transportStatus.mode === 'transfer') return this.transferTransport.submit(input);
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
