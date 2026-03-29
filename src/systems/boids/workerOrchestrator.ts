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

export class WorkerOrchestrator {
  private worker: Worker | null = null;
  private disposed = false;
  private useWorker = true;
  private useSharedBuffers = false;
  private hasJob = false;
  private pendingResult: SimulationOutput | null = null;
  private pendingFishCount = 0;
  private sharedBuffers: SharedSimulationBuffers | null = null;

  constructor() {
    this.useSharedBuffers = supportsSharedSimulationBuffers();
    this.initWorker();

    // Expose toggle via window for testing
    if (typeof window !== 'undefined') {
      window.toggleBoidsWorker = () => {
        this.useWorker = !this.useWorker;
        console.log(`[BoidsSystem] Worker enabled: ${this.useWorker}`);
      };
    }
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('../../workers/boids.worker.ts', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (event: MessageEvent<BoidsWorkerResponse>) => {
          if (this.disposed) return;
          const data = event.data;
          if (data.type === 'success') {
            if (data.mode === 'shared') {
              if (!this.sharedBuffers) {
                console.error('Shared boids worker returned a result before shared buffers were ready.');
              } else {
                this.pendingResult = createSharedSimulationOutput(
                  this.sharedBuffers,
                  data.snapshotRevision,
                  this.pendingFishCount,
                  data.eatenFoodCount
                );
              }
            } else {
              this.pendingResult = data.result;
            }
            this.hasJob = false;
          } else if (data.type === 'error') {
            console.error('Worker error:', data.error);
            this.hasJob = false;
          }
        };

        this.worker.onerror = (error) => {
          console.error('Worker error:', error);
          this.hasJob = false;
        };
      } catch (e) {
        console.error('Failed to create worker:', e);
        this.useWorker = false;
      }
    } else {
      this.useWorker = false;
    }
  }

  public getPendingResult() {
    const result = this.pendingResult;
    const count = this.pendingFishCount;
    return result ? { result, count } : null;
  }

  public clearPendingResult() {
    this.pendingResult = null;
    this.pendingFishCount = 0;
  }

  public isBusy() {
    return this.hasJob;
  }

  public submitJob(input: SimulationInput) {
    // Keep track of fish count for the result application
    this.pendingFishCount = input.fishCount;

    if (this.useWorker && this.worker) {
      this.hasJob = true;
      if (this.useSharedBuffers) {
        try {
          const nextBuffers = ensureSharedSimulationBuffers(
            this.sharedBuffers,
            input.fishCount,
            input.foodCount
          );

          if (nextBuffers !== this.sharedBuffers) {
            this.sharedBuffers = nextBuffers;
            this.worker.postMessage({
              type: 'shared-buffers',
              payload: serializeSharedSimulationBuffers(nextBuffers),
            });
          }

          if (!this.sharedBuffers) {
            throw new Error('Shared boids buffers were not initialized.');
          }

          copySimulationInputToShared(input, this.sharedBuffers);
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
          return;
        } catch (error) {
          console.warn('Shared boids worker setup failed, falling back to cloned messages.', error);
          this.useSharedBuffers = false;
          this.sharedBuffers = null;
        }
      }

      this.worker.postMessage(input);
    } else {
      // Main thread fallback
      try {
        const t0 = performance.now();
        this.pendingResult = simulateStep(input);
        const t1 = performance.now();
        // Record timing to debug collector
        try {
            const dbg = window.__vibe_debug || null;
          if (dbg) {
            dbg.simulateStep.push({ duration: t1 - t0, time: Date.now(), fishCount: input.fishCount });
          }
          } catch {
          /* ignore */
        }
      } catch (error) {
        console.error('Boids simulation failed', error);
      }
      this.hasJob = false;
    }
  }

  public dispose() {
    this.disposed = true;
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
