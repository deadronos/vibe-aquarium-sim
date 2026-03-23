import type { BoidsCache, Float32Buffer } from './types';
import { steerTo } from './steering';

export function calculateFeeding(
  px: number,
  py: number,
  pz: number,
  vx: number,
  vy: number,
  vz: number,
  foodCount: number,
  foodPositions: Float32Buffer,
  maxSpeed: number,
  maxForce: number,
  cache: BoidsCache,
  cellSize: number,
  out: { x: number; y: number; z: number }
): { x: number; y: number; z: number } {
  let steerX = 0;
  let steerY = 0;
  let steerZ = 0;

  if (foodCount > 0) {
    let closestIndex = -1;
    let minFoodDistSq = Infinity;

    // Use spatial hash for food lookup
    const { HASH_MASK, foodCellHead, foodCellNext } = cache;
    const detectionRadius = 5.0;

    const minX = Math.floor((px - detectionRadius) / cellSize);
    const maxX = Math.floor((px + detectionRadius) / cellSize);
    const minY = Math.floor((py - detectionRadius) / cellSize);
    const maxY = Math.floor((py + detectionRadius) / cellSize);
    const minZ = Math.floor((pz - detectionRadius) / cellSize);
    const maxZ = Math.floor((pz + detectionRadius) / cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const h = ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & HASH_MASK;
          let j = foodCellHead[h];

          while (j !== -1) {
            const fBase = j * 3;
            const fx = foodPositions[fBase];
            const fy = foodPositions[fBase + 1];
            const fz = foodPositions[fBase + 2];
            const dx = px - fx;
            const dy = py - fy;
            const dz = pz - fz;
            const dSq = dx * dx + dy * dy + dz * dz;

            if (dSq < minFoodDistSq) {
              minFoodDistSq = dSq;
              closestIndex = j;
            }
            j = foodCellNext[j];
          }
        }
      }
    }

    if (closestIndex >= 0 && minFoodDistSq < 25.0) { // Limit food seeking to 5m radius
      if (minFoodDistSq < 0.01) {
        // Prevent duplicate eaten food in the same step if multiple fish arrive
        if (!cache.eatenFoodIndices.includes(closestIndex)) {
          cache.eatenFoodIndices.push(closestIndex);
        }
      } else {
        const fBase = closestIndex * 3;
        const seekX = foodPositions[fBase] - px;
        const seekY = foodPositions[fBase + 1] - py;
        const seekZ = foodPositions[fBase + 2] - pz;
        const seekLenSq = seekX * seekX + seekY * seekY + seekZ * seekZ;
        const EPS = cache.EPS;
        if (seekLenSq > EPS) {
          steerTo(seekX, seekY, seekZ, vx, vy, vz, maxSpeed, maxForce * 2, cache);
          steerX = cache.tempSteer.x;
          steerY = cache.tempSteer.y;
          steerZ = cache.tempSteer.z;
        }
      }
    }
  }
  out.x = steerX;
  out.y = steerY;
  out.z = steerZ;
  return out;
}
