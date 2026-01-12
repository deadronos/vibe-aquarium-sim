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
  cache: BoidsCache
): { x: number; y: number; z: number } {
  let steerX = 0;
  let steerY = 0;
  let steerZ = 0;

  if (foodCount > 0) {
    let closestIndex = -1;
    let minFoodDistSq = Infinity;
    for (let f = 0; f < foodCount; f++) {
      const fBase = f * 3;
      const fx = foodPositions[fBase];
      const fy = foodPositions[fBase + 1];
      const fz = foodPositions[fBase + 2];
      const dx = px - fx;
      const dy = py - fy;
      const dz = pz - fz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < minFoodDistSq) {
        minFoodDistSq = dSq;
        closestIndex = f;
      }
    }

    if (closestIndex >= 0 && minFoodDistSq < 25.0) {
      if (minFoodDistSq < 0.01) {
        cache.eatenFoodIndices.push(closestIndex);
      } else {
        const fBase = closestIndex * 3;
        const seekX = foodPositions[fBase] - px;
        const seekY = foodPositions[fBase + 1] - py;
        const seekZ = foodPositions[fBase + 2] - pz;
        const seekLenSq = seekX * seekX + seekY * seekY + seekZ * seekZ;
        const EPS = cache.EPS;
        if (seekLenSq > EPS) {
            // Re-using logic similar to steerTo but tailored for seeking food
            // Wait, we can reuse steerTo if we want, but the original code had inline seek logic.
            // Let's use steerTo!
            // steerTo expects desired velocity direction (dx, dy, dz)
            // It calculates desired velocity = normalize(d) * maxSpeed
            // Then steering = desired - velocity
            // clamped to maxForce

            // The original code:
            // const invSeek = 1 / Math.sqrt(seekLenSq);
            // seekX *= invSeek * maxSpeed; ...
            // seekX -= vx; ...
            // clamp

            // This is exactly steerTo(seekX, seekY, seekZ, ...)

            steerTo(seekX, seekY, seekZ, vx, vy, vz, maxSpeed, maxForce * 2, cache);
            steerX = cache.tempSteer.x;
            steerY = cache.tempSteer.y;
            steerZ = cache.tempSteer.z;
        }
      }
    }
  }
  return { x: steerX, y: steerY, z: steerZ };
}
