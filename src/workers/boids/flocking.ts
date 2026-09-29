import type { Vec3Like } from '../../domain/types';
import type { BoidsCache, Float32Buffer } from './types';
import { steerTo } from './steering';

export type FlockingParams = {
  maxSpeed: number;
  maxForce: number;
  neighborDist: number;
  separationDist: number;
  weights?: {
    separation?: number;
    alignment?: number;
    cohesion?: number;
  };
};

/**
 * Accumulates separation/alignment/cohesion for a single fish into `out`.
 * Reuses `cache.tempSteer` for every `steerTo` call and writes the weighted
 * combined steering into the caller-provided `out` (no per-fish allocation).
 */
export function accumulateFlocking(
  i: number,
  positions: Float32Buffer,
  velocities: Float32Buffer,
  params: FlockingParams,
  cache: BoidsCache,
  cellSize: number,
  out: Vec3Like
): void {
  const { HASH_MASK, EPS, cellHead, cellNext } = cache;

  const base = i * 3;
  const px = positions[base];
  const py = positions[base + 1];
  const pz = positions[base + 2];

  const vx = velocities[base];
  const vy = velocities[base + 1];
  const vz = velocities[base + 2];

  const { maxSpeed, maxForce, neighborDist, separationDist, weights } = params;
  const neighborDistSq = neighborDist * neighborDist;
  const separationDistSq = separationDist * separationDist;

  // --- Flocking ---
  let sepX = 0;
  let sepY = 0;
  let sepZ = 0;
  let aliX = 0;
  let aliY = 0;
  let aliZ = 0;
  let cohX = 0;
  let cohY = 0;
  let cohZ = 0;
  let count = 0;

  const minX = Math.floor((px - neighborDist) / cellSize);
  const maxX = Math.floor((px + neighborDist) / cellSize);
  const minY = Math.floor((py - neighborDist) / cellSize);
  const maxY = Math.floor((py + neighborDist) / cellSize);
  const minZ = Math.floor((pz - neighborDist) / cellSize);
  const maxZ = Math.floor((pz + neighborDist) / cellSize);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        const h = ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & HASH_MASK;
        let j = cellHead[h];

        while (j !== -1) {
          if (j === i) {
            j = cellNext[j];
            continue;
          }

          const nBase = j * 3;
          const nx = positions[nBase];
          const ny = positions[nBase + 1];
          const nz = positions[nBase + 2];

          const dx = px - nx;
          const dy = py - ny;
          const dz = pz - nz;
          const dSq = dx * dx + dy * dy + dz * dz;

          if (dSq > 0 && dSq < neighborDistSq) {
            if (dSq < separationDistSq) {
              const inv = 1 / dSq;
              sepX += dx * inv;
              sepY += dy * inv;
              sepZ += dz * inv;
            }

            aliX += velocities[nBase];
            aliY += velocities[nBase + 1];
            aliZ += velocities[nBase + 2];

            cohX += nx;
            cohY += ny;
            cohZ += nz;

            count++;
          }
          j = cellNext[j];
        }
      }
    }
  }

  if (count > 0) {
    // Separation
    if (sepX * sepX + sepY * sepY + sepZ * sepZ > EPS) {
      sepX /= count;
      sepY /= count;
      sepZ /= count;
      steerTo(sepX, sepY, sepZ, vx, vy, vz, maxSpeed, maxForce, cache);
      sepX = cache.tempSteer.x;
      sepY = cache.tempSteer.y;
      sepZ = cache.tempSteer.z;
    } else {
      sepX = 0;
      sepY = 0;
      sepZ = 0;
    }

    // Alignment
    aliX /= count;
    aliY /= count;
    aliZ /= count;
    steerTo(aliX, aliY, aliZ, vx, vy, vz, maxSpeed, maxForce, cache);
    aliX = cache.tempSteer.x;
    aliY = cache.tempSteer.y;
    aliZ = cache.tempSteer.z;

    // Cohesion
    cohX = cohX / count - px;
    cohY = cohY / count - py;
    cohZ = cohZ / count - pz;
    steerTo(cohX, cohY, cohZ, vx, vy, vz, maxSpeed, maxForce, cache);
    cohX = cache.tempSteer.x;
    cohY = cache.tempSteer.y;
    cohZ = cache.tempSteer.z;
  }

  // Apply weights
  const { separation = 2.0, alignment = 1.0, cohesion = 1.0 } = weights || {};
  sepX *= separation;
  sepY *= separation;
  sepZ *= separation;

  aliX *= alignment;
  aliY *= alignment;
  aliZ *= alignment;

  cohX *= cohesion;
  cohZ *= cohesion;
  cohY *= cohesion;

  out.x = sepX + aliX + cohX;
  out.y = sepY + aliY + cohY;
  out.z = sepZ + aliZ + cohZ;
}
