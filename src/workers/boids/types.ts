import type { SpeciesParams } from '../../domain/species';

export type { SpeciesParams } from '../../domain/species';

export type Float32Buffer = Float32Array<ArrayBufferLike>;
export type Int32Buffer = Int32Array<ArrayBufferLike>;
export type EatenFoodIndices = number[] | Int32Buffer;

export type SimulationInput = {
  snapshotRevision: number;
  fishCount: number;
  positions: Float32Buffer;
  velocities: Float32Buffer;
  speciesIndices: Int32Array; // Per-fish species index
  species: SpeciesParams[]; // Species configurations ordered by species index
  foodCount: number;
  foodPositions: Float32Buffer;
  time: number;
  boids: { neighborDist: number; separationDist: number; maxSpeed: number; maxForce: number };
  bounds: { x: number; y: number; z: number };
  water: { density: number; dragCoefficient: number; crossSectionArea: number };
  current: {
    strength: number;
    frequency1: number;
    frequency2: number;
    spatialScale1: number;
    spatialScale2: number;
  };
};

export type SimulationOutput = {
  snapshotRevision: number;
  steering: Float32Buffer;
  externalForces: Float32Buffer;
  eatenFoodIndices: EatenFoodIndices;
};

export type SimulationOutputTarget = {
  steering: Float32Buffer;
  externalForces: Float32Buffer;
  eatenFoodIndices: Int32Buffer;
  eatenFoodCount?: Int32Buffer;
};

export type BoidsCache = {
  HASH_SIZE: number;
  HASH_MASK: number;
  cellHead: Int32Array;
  cellNext: Int32Array;
  foodCellHead: Int32Array;
  foodCellNext: Int32Array;
  eatenFoodIndexSet: Set<number>;
  tempSteer: { x: number; y: number; z: number };
  tempForce: { x: number; y: number; z: number };
  EPS: number;
  // Persistent output buffers
  steering: Float32Array;
  externalForces: Float32Array;
  eatenFoodIndices: number[];
};

export type BoidsCacheHost = typeof globalThis & {
  __boidsCache?: BoidsCache;
};
