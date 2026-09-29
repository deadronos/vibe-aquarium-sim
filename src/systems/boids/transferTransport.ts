import type { SimulationInput } from '../../workers/boids/types';
import type { BoidsWorkerResponse } from '../../workers/boids/sharedBuffers';
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
  type TransferableSimulationBuffers,
  type TransferableSimulationJobMessage,
} from '../../workers/boids/transferBuffers';
import type { TransportHost } from './transportHost';

type TransferSuccessResponse = Extract<BoidsWorkerResponse, { type: 'success'; mode: 'transfer' }>;

export type TransferTransport = {
  submit(input: SimulationInput): boolean;
  /** Completes an in-flight job from the worker response, or records a failure. */
  handleSuccess(data: TransferSuccessResponse): void;
  /**
   * Marks the active slot invalid after a worker error. Returns true when a
   * slot was active, so the caller can distinguish "slot was in flight" from
   * "shared transport failed" without inspecting slot state itself.
   */
  invalidateActiveSlot(): boolean;
  /** Releases the slot holding a pending result, if any. */
  releasePendingSlot(): void;
};

/**
 * Double-buffered transferable transport: each job is posted with its 8
 * ArrayBuffers in the transfer list, and the returned payload hydrates back
 * into the slot that produced it. The slot only returns to `free` once the
 * caller clears the pending result, so the returned buffers stay valid for
 * the consumer.
 */
export function createTransferTransport(host: TransportHost): TransferTransport {
  const slots: Array<TransferableSimulationBuffers | null> = [null, null];
  let activeSlotIndex: number | null = null;
  let pendingSlotIndex: number | null = null;

  const publishCapacity = (buffers: TransferableSimulationBuffers) => {
    host.status.fishCapacity = Math.max(host.status.fishCapacity, buffers.fishCapacity);
    host.status.foodCapacity = Math.max(host.status.foodCapacity, buffers.foodCapacity);
    host.publishStatus();
  };

  /**
   * Reuses a free slot that already fits, otherwise rebuilds a free/invalid
   * one. Returns null only when every slot is in flight.
   */
  const findTransferSlot = (fishCount: number, foodCount: number): number | null => {
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      if (
        slot &&
        slot.state === 'free' &&
        slot.fishCapacity >= fishCount &&
        slot.foodCapacity >= foodCount
      ) {
        return index;
      }
    }

    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      if (!slot || slot.state === 'invalid' || slot.state === 'free') {
        slots[index] = ensureTransferableSimulationBuffers(slot, fishCount, foodCount);
        const replacement = slots[index];
        if (replacement) publishCapacity(replacement);
        return index;
      }
    }

    return null;
  };

  return {
    submit(input: SimulationInput): boolean {
      const worker = host.worker;
      if (!worker) return host.submitMainThreadJob(input);

      const slotIndex = findTransferSlot(input.fishCount, input.foodCount);
      if (slotIndex === null) {
        host.setMode('copy', 'no free transfer slot');
        return host.submitClonedJob(input);
      }

      const slot = slots[slotIndex];
      if (!slot) return host.submitClonedJob(input);

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
        return host.submitClonedJob(input);
      }

      activeSlotIndex = slotIndex;
      host.setBusy(true);
      try {
        worker.postMessage(message, transferables);
        host.status.submitted += 1;
        host.publishStatus();
        return true;
      } catch (error) {
        invalidateTransferSlot(slot);
        activeSlotIndex = null;
        host.setBusy(false);
        host.recordError(error instanceof Error ? error.message : String(error));
        host.setMode('copy', 'transfer post failed; falling back to cloned messages');
        return host.submitClonedJob(input);
      }
    },

    handleSuccess(data: TransferSuccessResponse): void {
      const index = activeSlotIndex;
      const slot = index === null ? null : slots[index];
      if (index === null || !slot || slot.state !== 'in-flight' || slot.jobRevision === null) {
        host.handleWorkerFailure('transfer result arrived without an active slot');
        return;
      }

      const jobRevision = slot.jobRevision;
      const hydrated = hydrateTransferableSimulationBuffers(data.payload);
      slot.positions = hydrated.positions;
      slot.velocities = hydrated.velocities;
      slot.speciesIndices = hydrated.speciesIndices;
      slot.foodPositions = hydrated.foodPositions;
      slot.steering = hydrated.steering;
      slot.externalForces = hydrated.externalForces;
      slot.eatenFoodIndices = hydrated.eatenFoodIndices;
      slot.eatenFoodCount = hydrated.eatenFoodCount;

      if (!markTransferSlotPendingResult(slot, jobRevision)) {
        invalidateTransferSlot(slot);
        host.handleWorkerFailure('transfer slot state changed before result hydration');
        return;
      }

      pendingSlotIndex = index;
      activeSlotIndex = null;
      host.setPendingResult(
        createTransferSimulationOutput(
          slot,
          data.snapshotRevision,
          data.fishCount,
          data.eatenFoodCount
        ),
        data.fishCount
      );
      host.setBusy(false);
      host.status.completed += 1;
      host.publishStatus();
    },

    invalidateActiveSlot(): boolean {
      const index = activeSlotIndex;
      if (index === null) return false;

      const slot = slots[index];
      if (slot) invalidateTransferSlot(slot);
      activeSlotIndex = null;
      return true;
    },

    releasePendingSlot(): void {
      if (pendingSlotIndex === null) return;
      const slot = slots[pendingSlotIndex];
      if (slot) releaseTransferSlot(slot);
      pendingSlotIndex = null;
    },
  };
}
