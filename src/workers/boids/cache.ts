import type { BoidsCache, BoidsCacheHost } from './types';

export function getBoidsCache(fishCount: number): BoidsCache {
  const ctx = globalThis as unknown as BoidsCacheHost;

  // Initialize persistent cache if missing
  if (!ctx.__boidsCache) {
    const HASH_SIZE = 16384;
    ctx.__boidsCache = {
      HASH_SIZE,
      HASH_MASK: HASH_SIZE - 1,
      cellHead: new Int32Array(HASH_SIZE),
      cellNext: new Int32Array(2000), // Initial capacity
      tempSteer: { x: 0, y: 0, z: 0 },
      EPS: 1e-6,
      steering: new Float32Array(2000 * 3),
      externalForces: new Float32Array(2000 * 3),
      eatenFoodIndices: [],
    };
  }

  const cache = ctx.__boidsCache;

  // Resize cellNext if necessary
  if (fishCount > cache.cellNext.length) {
    const newCapacity = Math.ceil(fishCount * 1.5);
    cache.cellNext = new Int32Array(newCapacity);
  }

  // Resize output buffers if necessary
  if (fishCount * 3 > cache.steering.length) {
    const newCapacity = Math.ceil(fishCount * 1.5) * 3;
    cache.steering = new Float32Array(newCapacity);
    cache.externalForces = new Float32Array(newCapacity);
  }

  return cache;
}
