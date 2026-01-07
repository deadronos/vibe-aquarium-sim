import type { BoidsCache, Float32Buffer } from './types';

export function populateSpatialHash(
  fishCount: number,
  positions: Float32Buffer,
  cache: BoidsCache,
  cellSize: number
): void {
  const { HASH_MASK, cellHead, cellNext } = cache;

  // Clear hash table heads
  cellHead.fill(-1);

  // Pass 1: Populate spatial hash
  for (let i = 0; i < fishCount; i++) {
    const base = i * 3;
    const px = positions[base];
    const py = positions[base + 1];
    const pz = positions[base + 2];

    const gx = Math.floor(px / cellSize);
    const gy = Math.floor(py / cellSize);
    const gz = Math.floor(pz / cellSize);

    // Spatial hashing
    const h = ((gx * 73856093) ^ (gy * 19349663) ^ (gz * 83492791)) & HASH_MASK;

    cellNext[i] = cellHead[h];
    cellHead[h] = i;
  }
}
