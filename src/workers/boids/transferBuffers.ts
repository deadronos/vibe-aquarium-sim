import type {
  SimulationInput,
  SimulationOutput,
  SimulationOutputTarget,
  SpeciesParams,
} from './types';
import {
  assertCapacity,
  copySimulationInputInto,
  createFloat32,
  createInt32,
  createSimulationInputFromJob,
  createSimulationOutputFrom,
  createSimulationOutputTargetFrom,
  nextCapacity,
} from './simulationBuffers';

const MIN_FISH_CAPACITY = 16;
const MIN_FOOD_CAPACITY = 8;

export type TransferSlotState = 'free' | 'in-flight' | 'pending-result' | 'invalid';

export type TransferableSimulationBuffers = {
  fishCapacity: number;
  foodCapacity: number;
  positions: Float32Array<ArrayBuffer>;
  velocities: Float32Array<ArrayBuffer>;
  speciesIndices: Int32Array<ArrayBuffer>;
  foodPositions: Float32Array<ArrayBuffer>;
  steering: Float32Array<ArrayBuffer>;
  externalForces: Float32Array<ArrayBuffer>;
  eatenFoodIndices: Int32Array<ArrayBuffer>;
  eatenFoodCount: Int32Array<ArrayBuffer>;
  state: TransferSlotState;
  jobRevision: number | null;
};

export type TransferableSimulationBufferPayload = {
  fishCapacity: number;
  foodCapacity: number;
  positions: ArrayBuffer;
  velocities: ArrayBuffer;
  speciesIndices: ArrayBuffer;
  foodPositions: ArrayBuffer;
  steering: ArrayBuffer;
  externalForces: ArrayBuffer;
  eatenFoodIndices: ArrayBuffer;
  eatenFoodCount: ArrayBuffer;
};

export type TransferableSimulationJobMessage = {
  type: 'transfer-job';
  payload: TransferableSimulationBufferPayload;
  snapshotRevision: number;
  fishCount: number;
  foodCount: number;
  time: number;
  species: SpeciesParams[];
  boids: SimulationInput['boids'];
  bounds: SimulationInput['bounds'];
  water: SimulationInput['water'];
  current: SimulationInput['current'];
};

export type TransferableSimulationSuccessMessage = {
  type: 'success';
  mode: 'transfer';
  payload: TransferableSimulationBufferPayload;
  snapshotRevision: number;
  fishCount: number;
  foodCount: number;
  eatenFoodCount: number;
};

type TransferSupportScope = {
  ArrayBuffer?: typeof ArrayBuffer;
};

export function supportsTransferableSimulationBuffers(
  scope: TransferSupportScope = globalThis as TransferSupportScope
) {
  return typeof scope.ArrayBuffer === 'function';
}

export function createTransferableSimulationBuffers(
  fishCapacity: number,
  foodCapacity: number
): TransferableSimulationBuffers {
  const safeFishCapacity = nextCapacity(fishCapacity, MIN_FISH_CAPACITY);
  const safeFoodCapacity = nextCapacity(foodCapacity, MIN_FOOD_CAPACITY);

  return {
    fishCapacity: safeFishCapacity,
    foodCapacity: safeFoodCapacity,
    positions: createFloat32(safeFishCapacity * 3),
    velocities: createFloat32(safeFishCapacity * 3),
    speciesIndices: createInt32(safeFishCapacity),
    foodPositions: createFloat32(safeFoodCapacity * 3),
    steering: createFloat32(safeFishCapacity * 3),
    externalForces: createFloat32(safeFishCapacity * 3),
    eatenFoodIndices: createInt32(safeFoodCapacity),
    eatenFoodCount: createInt32(1),
    state: 'free',
    jobRevision: null,
  };
}

export function ensureTransferableSimulationBuffers(
  buffers: TransferableSimulationBuffers | null,
  fishCount: number,
  foodCount: number
) {
  if (
    buffers &&
    buffers.state !== 'invalid' &&
    buffers.fishCapacity >= fishCount &&
    buffers.foodCapacity >= foodCount
  ) {
    return buffers;
  }

  return createTransferableSimulationBuffers(fishCount, foodCount);
}

export function copySimulationInputToTransfer(
  input: SimulationInput,
  buffers: TransferableSimulationBuffers
) {
  assertCapacity(input.fishCount, input.foodCount, buffers, 'Transferable');
  copySimulationInputInto(input, buffers);
}

export function serializeTransferableSimulationBuffers(buffers: TransferableSimulationBuffers) {
  const payload: TransferableSimulationBufferPayload = {
    fishCapacity: buffers.fishCapacity,
    foodCapacity: buffers.foodCapacity,
    positions: buffers.positions.buffer,
    velocities: buffers.velocities.buffer,
    speciesIndices: buffers.speciesIndices.buffer,
    foodPositions: buffers.foodPositions.buffer,
    steering: buffers.steering.buffer,
    externalForces: buffers.externalForces.buffer,
    eatenFoodIndices: buffers.eatenFoodIndices.buffer,
    eatenFoodCount: buffers.eatenFoodCount.buffer,
  };

  return {
    payload,
    transferables: [
      payload.positions,
      payload.velocities,
      payload.speciesIndices,
      payload.foodPositions,
      payload.steering,
      payload.externalForces,
      payload.eatenFoodIndices,
      payload.eatenFoodCount,
    ] satisfies ArrayBuffer[],
  };
}

export function hydrateTransferableSimulationBuffers(
  payload: TransferableSimulationBufferPayload
): TransferableSimulationBuffers {
  return {
    fishCapacity: payload.fishCapacity,
    foodCapacity: payload.foodCapacity,
    positions: new Float32Array(payload.positions),
    velocities: new Float32Array(payload.velocities),
    speciesIndices: new Int32Array(payload.speciesIndices),
    foodPositions: new Float32Array(payload.foodPositions),
    steering: new Float32Array(payload.steering),
    externalForces: new Float32Array(payload.externalForces),
    eatenFoodIndices: new Int32Array(payload.eatenFoodIndices),
    eatenFoodCount: new Int32Array(payload.eatenFoodCount),
    state: 'free',
    jobRevision: null,
  };
}

export function createTransferSimulationInput(
  message: TransferableSimulationJobMessage,
  buffers: TransferableSimulationBuffers
): SimulationInput {
  assertCapacity(message.fishCount, message.foodCount, buffers, 'Transferable');
  return createSimulationInputFromJob(message, buffers);
}

export function createTransferSimulationOutputTarget(
  buffers: TransferableSimulationBuffers,
  fishCount: number,
  foodCount: number
): SimulationOutputTarget {
  return createSimulationOutputTargetFrom(buffers, fishCount, foodCount, 'Transferable');
}

export function createTransferSimulationOutput(
  buffers: TransferableSimulationBuffers,
  snapshotRevision: number,
  fishCount: number,
  eatenFoodCount: number = buffers.eatenFoodCount[0]
): SimulationOutput {
  return createSimulationOutputFrom(buffers, snapshotRevision, fishCount, eatenFoodCount);
}

export function markTransferSlotInFlight(
  slot: TransferableSimulationBuffers,
  snapshotRevision: number
) {
  if (slot.state !== 'free') return false;
  slot.state = 'in-flight';
  slot.jobRevision = snapshotRevision;
  return true;
}

export function markTransferSlotPendingResult(
  slot: TransferableSimulationBuffers,
  snapshotRevision: number
) {
  if (slot.state !== 'in-flight' || slot.jobRevision !== snapshotRevision) return false;
  slot.state = 'pending-result';
  return true;
}

export function releaseTransferSlot(slot: TransferableSimulationBuffers) {
  if (slot.state !== 'pending-result') return false;
  slot.state = 'free';
  slot.jobRevision = null;
  return true;
}

export function invalidateTransferSlot(slot: TransferableSimulationBuffers) {
  slot.state = 'invalid';
  slot.jobRevision = null;
}
