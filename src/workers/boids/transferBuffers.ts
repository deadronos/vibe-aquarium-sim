import type {
  SimulationInput,
  SimulationOutput,
  SimulationOutputTarget,
  SpeciesParams,
} from './types';

const MIN_FISH_CAPACITY = 16;
const MIN_FOOD_CAPACITY = 8;

export type TransferSlotState = 'free' | 'in-flight' | 'pending-result' | 'invalid';

export type TransferableSimulationBuffers = {
  fishCapacity: number;
  foodCapacity: number;
  positions: Float32Array<ArrayBuffer>;
  velocities: Float32Array<ArrayBuffer>;
  modelIndices: Int32Array<ArrayBuffer>;
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
  modelIndices: ArrayBuffer;
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

const nextCapacity = (requested: number, minimum: number) =>
  Math.max(minimum, Math.ceil(requested * 1.5));

const createFloat32 = (length: number) =>
  new Float32Array(new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * length));

const createInt32 = (length: number) =>
  new Int32Array(new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT * length));

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
    modelIndices: createInt32(safeFishCapacity),
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
  if (buffers && buffers.fishCapacity >= fishCount && buffers.foodCapacity >= foodCount) {
    return buffers;
  }

  return createTransferableSimulationBuffers(fishCount, foodCount);
}

export function copySimulationInputToTransfer(
  input: SimulationInput,
  buffers: TransferableSimulationBuffers
) {
  if (input.fishCount > buffers.fishCapacity || input.foodCount > buffers.foodCapacity) {
    throw new Error('Transferable boids buffer capacity is too small for the submitted job.');
  }

  buffers.positions.set(input.positions.subarray(0, input.fishCount * 3), 0);
  buffers.velocities.set(input.velocities.subarray(0, input.fishCount * 3), 0);
  buffers.modelIndices.set(input.modelIndices.subarray(0, input.fishCount), 0);
  buffers.foodPositions.set(input.foodPositions.subarray(0, input.foodCount * 3), 0);
  buffers.eatenFoodCount[0] = 0;
}

export function serializeTransferableSimulationBuffers(
  buffers: TransferableSimulationBuffers
) {
  const payload: TransferableSimulationBufferPayload = {
    fishCapacity: buffers.fishCapacity,
    foodCapacity: buffers.foodCapacity,
    positions: buffers.positions.buffer,
    velocities: buffers.velocities.buffer,
    modelIndices: buffers.modelIndices.buffer,
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
      payload.modelIndices,
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
    modelIndices: new Int32Array(payload.modelIndices),
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
  if (message.fishCount > buffers.fishCapacity || message.foodCount > buffers.foodCapacity) {
    throw new Error('Transferable boids buffer capacity is too small for the submitted job.');
  }

  return {
    snapshotRevision: message.snapshotRevision,
    fishCount: message.fishCount,
    positions: buffers.positions.subarray(0, message.fishCount * 3),
    velocities: buffers.velocities.subarray(0, message.fishCount * 3),
    modelIndices: buffers.modelIndices.subarray(0, message.fishCount),
    species: message.species,
    foodCount: message.foodCount,
    foodPositions: buffers.foodPositions.subarray(0, message.foodCount * 3),
    time: message.time,
    boids: message.boids,
    bounds: message.bounds,
    water: message.water,
    current: message.current,
  };
}

export function createTransferSimulationOutputTarget(
  buffers: TransferableSimulationBuffers,
  fishCount: number,
  foodCount: number
): SimulationOutputTarget {
  if (fishCount > buffers.fishCapacity || foodCount > buffers.foodCapacity) {
    throw new Error('Transferable boids buffer capacity is too small for the completed job.');
  }

  return {
    steering: buffers.steering.subarray(0, fishCount * 3),
    externalForces: buffers.externalForces.subarray(0, fishCount * 3),
    eatenFoodIndices: buffers.eatenFoodIndices.subarray(0, foodCount),
    eatenFoodCount: buffers.eatenFoodCount,
  };
}

export function createTransferSimulationOutput(
  buffers: TransferableSimulationBuffers,
  snapshotRevision: number,
  fishCount: number,
  eatenFoodCount: number = buffers.eatenFoodCount[0]
): SimulationOutput {
  const safeEatenFoodCount = Math.max(0, Math.min(eatenFoodCount, buffers.foodCapacity));

  return {
    snapshotRevision,
    steering: buffers.steering.subarray(0, fishCount * 3),
    externalForces: buffers.externalForces.subarray(0, fishCount * 3),
    eatenFoodIndices: buffers.eatenFoodIndices.subarray(0, safeEatenFoodCount),
  };
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
