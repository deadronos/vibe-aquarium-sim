export type Float32Buffer = Float32Array<ArrayBufferLike>;

export type SimulationInput = {
  fishCount: number;
  positions: Float32Buffer;
  velocities: Float32Buffer;
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
  steering: Float32Buffer;
  externalForces: Float32Buffer;
  eatenFoodIndices: number[];
};

export type BoidsCache = {
  HASH_SIZE: number;
  HASH_MASK: number;
  cellHead: Int32Array;
  cellNext: Int32Array;
  tempSteer: { x: number; y: number; z: number };
  EPS: number;
  // Persistent output buffers
  steering: Float32Array;
  externalForces: Float32Array;
  eatenFoodIndices: number[];
};

export type BoidsCacheHost = typeof globalThis & {
  __boidsCache?: BoidsCache;
};
