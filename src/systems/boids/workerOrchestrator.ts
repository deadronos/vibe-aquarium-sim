import type { SimulationInput, SimulationOutput } from '../../workers/simulationWorker';
import { simulateStep } from '../../workers/simulationWorker';

export class WorkerOrchestrator {
  private worker: Worker | null = null;
  private disposed = false;
  private useWorker = true;
  private hasJob = false;
  private pendingResult: SimulationOutput | null = null;
  private pendingFishCount = 0;

  constructor() {
    this.initWorker();

    // Expose toggle via window for testing
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).toggleBoidsWorker = () => {
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

        this.worker.onmessage = (event) => {
          if (this.disposed) return;
          const data = event.data;
          if (data.type === 'success') {
            this.pendingResult = data.result;
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
      this.worker.postMessage(input);
    } else {
      // Main thread fallback
      try {
        const t0 = performance.now();
        this.pendingResult = simulateStep(input);
        const t1 = performance.now();
        // Record timing to debug collector
        try {
          const w = window as any;
          const dbg = w && w.__vibe_debug ? w.__vibe_debug : null;
          if (dbg) {
            dbg.simulateStep.push({ duration: t1 - t0, time: Date.now(), fishCount: input.fishCount });
          }
        } catch (e) {
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
