import type {
  SimulationInput,
  SimulationOutput,
  SimulationOutputTarget,
} from './types';

export type SimulationInputStorage = {
  positions: Float32Array<ArrayBufferLike>;
  velocities: Float32Array<ArrayBufferLike>;
  speciesIndices: Int32Array<ArrayBufferLike>;
  foodPositions: Float32Array<ArrayBufferLike>;
  eatenFoodCount: Int32Array<ArrayBufferLike>;
};

export type SimulationOutputStorage = {
  fishCapacity: number;
  foodCapacity: number;
  steering: Float32Array<ArrayBufferLike>;
  externalForces: Float32Array<ArrayBufferLike>;
  eatenFoodIndices: Int32Array<ArrayBufferLike>;
  eatenFoodCount: Int32Array<ArrayBufferLike>;
};

export type SimulationJobMessage = {
  snapshotRevision: number;
  fishCount: number;
  foodCount: number;
  time: number;
  species: SimulationInput['species'];
  boids: SimulationInput['boids'];
  bounds: SimulationInput['bounds'];
  water: SimulationInput['water'];
  current: SimulationInput['current'];
};

export function nextCapacity(requested: number, minimum: number): number {
  return Math.max(minimum, Math.ceil(requested * 1.5));
}

export function createFloat32(length: number): Float32Array<ArrayBuffer> {
  return new Float32Array(new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT * length));
}

export function createInt32(length: number): Int32Array<ArrayBuffer> {
  return new Int32Array(new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT * length));
}

export function assertCapacity(
  fishCount: number,
  foodCount: number,
  capacities: { fishCapacity: number; foodCapacity: number },
  label: string
): void {
  if (fishCount > capacities.fishCapacity || foodCount > capacities.foodCapacity) {
    throw new Error(`${label} boids buffer capacity is too small for the submitted job.`);
  }
}

export function copySimulationInputInto(
  input: SimulationInput,
  buffers: SimulationInputStorage
): void {
  buffers.positions.set(input.positions.subarray(0, input.fishCount * 3), 0);
  buffers.velocities.set(input.velocities.subarray(0, input.fishCount * 3), 0);
  buffers.speciesIndices.set(input.speciesIndices.subarray(0, input.fishCount), 0);
  buffers.foodPositions.set(input.foodPositions.subarray(0, input.foodCount * 3), 0);
  buffers.eatenFoodCount[0] = 0;
}

export function createSimulationInputFromJob(
  message: SimulationJobMessage,
  buffers: SimulationInputStorage
): SimulationInput {
  return {
    snapshotRevision: message.snapshotRevision,
    fishCount: message.fishCount,
    positions: buffers.positions.subarray(0, message.fishCount * 3),
    velocities: buffers.velocities.subarray(0, message.fishCount * 3),
    speciesIndices: buffers.speciesIndices.subarray(0, message.fishCount),
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

export function createSimulationOutputTargetFrom(
  buffers: SimulationOutputStorage,
  fishCount: number,
  foodCount: number,
  label: string
): SimulationOutputTarget {
  if (fishCount > buffers.fishCapacity || foodCount > buffers.foodCapacity) {
    throw new Error(`${label} boids buffer capacity is too small for the completed job.`);
  }

  return {
    steering: buffers.steering.subarray(0, fishCount * 3),
    externalForces: buffers.externalForces.subarray(0, fishCount * 3),
    eatenFoodIndices: buffers.eatenFoodIndices.subarray(0, foodCount),
    eatenFoodCount: buffers.eatenFoodCount,
  };
}

export function createSimulationOutputFrom(
  buffers: SimulationOutputStorage,
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
