import type { SimulationInput, SimulationOutput } from '../../workers/boids/types';

/**
 * The slice of `WorkerOrchestrator` a transport module is allowed to touch.
 *
 * Transports own their buffer/slot state; everything shared with the rest of
 * the orchestrator (worker handle, status object, job slot, and the fallback
 * chains) is reached through this host, so fallback ordering lives in exactly
 * one place.
 */
export type TransportHost = {
  /** Current worker handle. Re-read on each access: it is nulled when torn down. */
  readonly worker: Worker | null;
  readonly status: VibeTransportStatus;
  /** Publishes the live status object with the orchestrator's current busy flag. */
  publishStatus(): void;
  setBusy(busy: boolean): void;
  setMode(mode: VibeTransportMode, reason?: string | null): void;
  recordError(reason: string): void;
  /** Stores a completed result, plus the fish count it covers, for the caller. */
  setPendingResult(result: SimulationOutput, fishCount: number): void;
  /**
   * Hands a failure back to the orchestrator so it owns the shared/transfer/
   * copy transition. Transports never switch modes themselves on failure.
   */
  handleWorkerFailure(reason: string): void;
  /** Fallback chain owned by the orchestrator, not by the transports. */
  submitClonedJob(input: SimulationInput): boolean;
  submitMainThreadJob(input: SimulationInput): boolean;
  submitTransferOrCopy(input: SimulationInput): boolean;
};
