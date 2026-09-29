import type { SimulationInput, SimulationOutput } from '../../workers/boids/types';
import {
  copySimulationInputToShared,
  createSharedSimulationOutput,
  ensureSharedSimulationBuffers,
  serializeSharedSimulationBuffers,
  type SharedSimulationBuffers,
} from '../../workers/boids/sharedBuffers';
import { supportsTransferableSimulationBuffers } from '../../workers/boids/transferBuffers';
import type { TransportHost } from './transportHost';

export type SharedTransport = {
  submit(input: SimulationInput): boolean;
  /**
   * Builds the submitted job's output from the shared buffers. Returns null
   * when no buffers are published yet, which the caller treats as a worker
   * failure rather than an empty result.
   */
  takeOutput(
    snapshotRevision: number,
    eatenFoodCount: number,
    fishCount: number
  ): SimulationOutput | null;
  /** Drops the published buffers so the next job re-publishes them. */
  invalidate(): void;
};

/**
 * SharedArrayBuffer transport: publishes the buffers once per capacity change
 * and then hands each job over as a small structured-clone control message.
 *
 * A failed publish or copy is not recoverable in place, so it records the
 * error, drops the buffers, and hands the job to the orchestrator's
 * transfer-or-copy fallback.
 */
export function createSharedTransport(host: TransportHost): SharedTransport {
  let buffers: SharedSimulationBuffers | null = null;

  return {
    submit(input: SimulationInput): boolean {
      const worker = host.worker;
      if (!worker) return host.submitClonedJob(input);

      try {
        const nextBuffers = ensureSharedSimulationBuffers(
          buffers,
          input.fishCount,
          input.foodCount
        );

        if (nextBuffers !== buffers) {
          buffers = nextBuffers;
          host.status.fishCapacity = nextBuffers.fishCapacity;
          host.status.foodCapacity = nextBuffers.foodCapacity;
          worker.postMessage({
            type: 'shared-buffers',
            payload: serializeSharedSimulationBuffers(nextBuffers),
          });
        }

        if (!buffers) throw new Error('Shared boids buffers were not initialized.');
        copySimulationInputToShared(input, buffers);
        host.setBusy(true);
        worker.postMessage({
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
        host.status.submitted += 1;
        host.publishStatus();
        return true;
      } catch (error) {
        host.setBusy(false);
        buffers = null;
        host.recordError(error instanceof Error ? error.message : String(error));
        host.setMode(
          supportsTransferableSimulationBuffers() ? 'transfer' : 'copy',
          'shared transport failed; falling back'
        );
        return host.submitTransferOrCopy(input);
      }
    },

    takeOutput(
      snapshotRevision: number,
      eatenFoodCount: number,
      fishCount: number
    ): SimulationOutput | null {
      if (!buffers) return null;
      return createSharedSimulationOutput(buffers, snapshotRevision, fishCount, eatenFoodCount);
    },

    invalidate(): void {
      buffers = null;
    },
  };
}
