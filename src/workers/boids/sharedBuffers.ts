import type {
  SimulationInput,
  SimulationOutput,
  SimulationOutputTarget,
  SpeciesParams,
} from './types';
import type {
  TransferableSimulationJobMessage,
  TransferableSimulationSuccessMessage,
} from './transferBuffers';
import {
  assertCapacity,
  copySimulationInputInto,
  createSimulationInputFromJob,
  createSimulationOutputFrom,
  createSimulationOutputTargetFrom,
  nextCapacity,
} from './simulationBuffers';

const MIN_FISH_CAPACITY = 16;
const MIN_FOOD_CAPACITY = 8;

type SharedSupportScope = {
  SharedArrayBuffer?: typeof SharedArrayBuffer;
  crossOriginIsolated?: boolean;
};

export type SharedSimulationBuffers = {
  fishCapacity: number;
  foodCapacity: number;
  positions: Float32Array<SharedArrayBuffer>;
  velocities: Float32Array<SharedArrayBuffer>;
  speciesIndices: Int32Array<SharedArrayBuffer>;
  foodPositions: Float32Array<SharedArrayBuffer>;
  steering: Float32Array<SharedArrayBuffer>;
  externalForces: Float32Array<SharedArrayBuffer>;
  eatenFoodIndices: Int32Array<SharedArrayBuffer>;
  eatenFoodCount: Int32Array<SharedArrayBuffer>;
};

export type SharedSimulationBufferPayload = {
  fishCapacity: number;
  foodCapacity: number;
  positions: SharedArrayBuffer;
  velocities: SharedArrayBuffer;
  speciesIndices: SharedArrayBuffer;
  foodPositions: SharedArrayBuffer;
  steering: SharedArrayBuffer;
  externalForces: SharedArrayBuffer;
  eatenFoodIndices: SharedArrayBuffer;
  eatenFoodCount: SharedArrayBuffer;
};

export type SharedSimulationBuffersMessage = {
  type: 'shared-buffers';
  payload: SharedSimulationBufferPayload;
};

export type SharedSimulationJobMessage = {
  type: 'shared-job';
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

export type SharedSimulationSuccessMessage = {
  type: 'success';
  mode: 'shared';
  snapshotRevision: number;
  eatenFoodCount: number;
};

export type ClonedSimulationSuccessMessage = {
  type: 'success';
  mode: 'copy';
  result: SimulationOutput;
};

export type WorkerSimulationErrorMessage = {
  type: 'error';
  error: string;
};

export type BoidsWorkerMessage =
  | SimulationInput
  | SharedSimulationBuffersMessage
  | SharedSimulationJobMessage
  | TransferableSimulationJobMessage;

export type BoidsWorkerResponse =
  | SharedSimulationSuccessMessage
  | ClonedSimulationSuccessMessage
  | TransferableSimulationSuccessMessage
  | WorkerSimulationErrorMessage;

const createSharedFloat32 = (length: number) =>
  new Float32Array(new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * length));

const createSharedInt32 = (length: number) =>
  new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * length));

export function supportsSharedSimulationBuffers(
  scope: SharedSupportScope = globalThis as SharedSupportScope
) {
  return typeof scope.SharedArrayBuffer === 'function' && scope.crossOriginIsolated === true;
}

export function createSharedSimulationBuffers(
  fishCapacity: number,
  foodCapacity: number
): SharedSimulationBuffers {
  const safeFishCapacity = nextCapacity(fishCapacity, MIN_FISH_CAPACITY);
  const safeFoodCapacity = nextCapacity(foodCapacity, MIN_FOOD_CAPACITY);

  return {
    fishCapacity: safeFishCapacity,
    foodCapacity: safeFoodCapacity,
    positions: createSharedFloat32(safeFishCapacity * 3),
    velocities: createSharedFloat32(safeFishCapacity * 3),
    speciesIndices: createSharedInt32(safeFishCapacity),
    foodPositions: createSharedFloat32(safeFoodCapacity * 3),
    steering: createSharedFloat32(safeFishCapacity * 3),
    externalForces: createSharedFloat32(safeFishCapacity * 3),
    eatenFoodIndices: createSharedInt32(safeFoodCapacity),
    eatenFoodCount: createSharedInt32(1),
  };
}

export function ensureSharedSimulationBuffers(
  buffers: SharedSimulationBuffers | null,
  fishCount: number,
  foodCount: number
) {
  if (buffers && buffers.fishCapacity >= fishCount && buffers.foodCapacity >= foodCount) {
    return buffers;
  }

  return createSharedSimulationBuffers(fishCount, foodCount);
}

export function serializeSharedSimulationBuffers(
  buffers: SharedSimulationBuffers
): SharedSimulationBufferPayload {
  return {
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
}

export function hydrateSharedSimulationBuffers(
  payload: SharedSimulationBufferPayload
): SharedSimulationBuffers {
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
  };
}

export function copySimulationInputToShared(
  input: SimulationInput,
  buffers: SharedSimulationBuffers
) {
  assertCapacity(input.fishCount, input.foodCount, buffers, 'Shared');
  copySimulationInputInto(input, buffers);
}

export function createSharedSimulationInput(
  message: SharedSimulationJobMessage,
  buffers: SharedSimulationBuffers
): SimulationInput {
  return createSimulationInputFromJob(message, buffers);
}

export function createSharedSimulationOutputTarget(
  buffers: SharedSimulationBuffers,
  fishCount: number,
  foodCount: number
): SimulationOutputTarget {
  return createSimulationOutputTargetFrom(buffers, fishCount, foodCount, 'Shared');
}

export function createSharedSimulationOutput(
  buffers: SharedSimulationBuffers,
  snapshotRevision: number,
  fishCount: number,
  eatenFoodCount: number = buffers.eatenFoodCount[0]
): SimulationOutput {
  return createSimulationOutputFrom(buffers, snapshotRevision, fishCount, eatenFoodCount);
}

export function isSharedSimulationBuffersMessage(
  message: BoidsWorkerMessage
): message is SharedSimulationBuffersMessage {
  return 'type' in message && message.type === 'shared-buffers';
}

export function isSharedSimulationJobMessage(
  message: BoidsWorkerMessage
): message is SharedSimulationJobMessage {
  return 'type' in message && message.type === 'shared-job';
}

export function isTransferSimulationJobMessage(
  message: BoidsWorkerMessage
): message is TransferableSimulationJobMessage {
  return 'type' in message && message.type === 'transfer-job';
}

export function isTransferSimulationSuccessMessage(
  message: BoidsWorkerResponse
): message is TransferableSimulationSuccessMessage {
  return message.type === 'success' && message.mode === 'transfer';
}

export function isClonedSimulationSuccessMessage(
  message: BoidsWorkerResponse
): message is ClonedSimulationSuccessMessage {
  return message.type === 'success' && message.mode === 'copy';
}
