import type {
  SimulationInput,
  SimulationOutput,
  SimulationOutputTarget,
  SpeciesParams,
} from './types';

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
  modelIndices: Int32Array<SharedArrayBuffer>;
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
  modelIndices: SharedArrayBuffer;
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
  | SharedSimulationJobMessage;

export type BoidsWorkerResponse =
  | SharedSimulationSuccessMessage
  | ClonedSimulationSuccessMessage
  | WorkerSimulationErrorMessage;

const nextCapacity = (requested: number, minimum: number) =>
  Math.max(minimum, Math.ceil(requested * 1.5));

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
    modelIndices: createSharedInt32(safeFishCapacity),
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
    modelIndices: buffers.modelIndices.buffer,
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
    modelIndices: new Int32Array(payload.modelIndices),
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
  if (input.fishCount > buffers.fishCapacity || input.foodCount > buffers.foodCapacity) {
    throw new Error('Shared boids buffer capacity is too small for the submitted job.');
  }

  buffers.positions.set(input.positions.subarray(0, input.fishCount * 3), 0);
  buffers.velocities.set(input.velocities.subarray(0, input.fishCount * 3), 0);
  buffers.modelIndices.set(input.modelIndices.subarray(0, input.fishCount), 0);
  buffers.foodPositions.set(input.foodPositions.subarray(0, input.foodCount * 3), 0);
  buffers.eatenFoodCount[0] = 0;
}

export function createSharedSimulationInput(
  message: SharedSimulationJobMessage,
  buffers: SharedSimulationBuffers
): SimulationInput {
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

export function createSharedSimulationOutputTarget(
  buffers: SharedSimulationBuffers,
  fishCount: number,
  foodCount: number
): SimulationOutputTarget {
  if (fishCount > buffers.fishCapacity || foodCount > buffers.foodCapacity) {
    throw new Error('Shared boids buffer capacity is too small for the completed job.');
  }

  return {
    steering: buffers.steering.subarray(0, fishCount * 3),
    externalForces: buffers.externalForces.subarray(0, fishCount * 3),
    eatenFoodIndices: buffers.eatenFoodIndices.subarray(0, foodCount),
    eatenFoodCount: buffers.eatenFoodCount,
  };
}

export function createSharedSimulationOutput(
  buffers: SharedSimulationBuffers,
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
