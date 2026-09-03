import { simulateStep, type SimulationInput } from './simulationWorker';
import {
  createSharedSimulationInput,
  createSharedSimulationOutputTarget,
  hydrateSharedSimulationBuffers,
  isSharedSimulationBuffersMessage,
  isSharedSimulationJobMessage,
  isTransferSimulationJobMessage,
  type BoidsWorkerMessage,
  type BoidsWorkerResponse,
  type SharedSimulationBuffers,
} from './boids/sharedBuffers';
import {
  createTransferSimulationInput,
  createTransferSimulationOutputTarget,
  hydrateTransferableSimulationBuffers,
  serializeTransferableSimulationBuffers,
} from './boids/transferBuffers';

let sharedBuffers: SharedSimulationBuffers | null = null;

self.onmessage = (event: MessageEvent<BoidsWorkerMessage>) => {
  try {
    const message = event.data;

    if (isSharedSimulationBuffersMessage(message)) {
      sharedBuffers = hydrateSharedSimulationBuffers(message.payload);
      return;
    }

    if (isSharedSimulationJobMessage(message)) {
      if (!sharedBuffers) {
        throw new Error(
          'Shared boids buffers were not initialized before submitting a shared job.'
        );
      }

      simulateStep(
        createSharedSimulationInput(message, sharedBuffers),
        createSharedSimulationOutputTarget(sharedBuffers, message.fishCount, message.foodCount)
      );

      self.postMessage({
        type: 'success',
        mode: 'shared',
        snapshotRevision: message.snapshotRevision,
        eatenFoodCount: sharedBuffers.eatenFoodCount[0],
      } satisfies BoidsWorkerResponse);
      return;
    }

    if (isTransferSimulationJobMessage(message)) {
      const transferBuffers = hydrateTransferableSimulationBuffers(message.payload);
      const result = simulateStep(
        createTransferSimulationInput(message, transferBuffers),
        createTransferSimulationOutputTarget(
          transferBuffers,
          message.fishCount,
          message.foodCount
        )
      );
      const { payload, transferables } = serializeTransferableSimulationBuffers(transferBuffers);

      self.postMessage(
        {
          type: 'success',
          mode: 'transfer',
          payload,
          snapshotRevision: message.snapshotRevision,
          fishCount: message.fishCount,
          foodCount: message.foodCount,
          eatenFoodCount: result.eatenFoodIndices.length,
        } satisfies BoidsWorkerResponse,
        transferables
      );
      return;
    }

    const result = simulateStep(message as SimulationInput);
    self.postMessage({ type: 'success', mode: 'copy', result } satisfies BoidsWorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    } satisfies BoidsWorkerResponse);
  }
};
