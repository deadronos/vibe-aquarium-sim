import type { SimulationInput, SimulationOutput, SimulationOutputTarget } from './types';
import { getBoidsCache } from './cache';
import { populateSpatialHash, populateFoodSpatialHash } from './spatialHash';
import { steerTo } from './steering';
import { calculateFeeding } from './feeding';
import { calculateDragForce, calculateWaterCurrent } from '../../utils/physicsMath';
import { checkBoundViolation, isAnyBoundViolated } from '../../utils/boundaryMath';

export function simulateStep(
  input: SimulationInput,
  outputTarget?: SimulationOutputTarget
): SimulationOutput {
  const {
    fishCount,
    positions,
    velocities,
    modelIndices,
    species = [],
    foodCount,
    foodPositions,
    time,
    boids,
    bounds,
    water,
    current,
  } = input;

  const cache = getBoidsCache(fishCount, foodCount);
  const { HASH_MASK, EPS, cellHead, cellNext, eatenFoodIndices } = cache;
  const steering = outputTarget?.steering ?? cache.steering;
  const externalForces = outputTarget?.externalForces ?? cache.externalForces;

  // Zero-fill buffers
  steering.fill(0, 0, fishCount * 3);
  externalForces.fill(0, 0, fishCount * 3);
  if (outputTarget?.eatenFoodCount) {
    outputTarget.eatenFoodCount[0] = 0;
  }

  // Clear eaten food indices
  eatenFoodIndices.length = 0;
  cache.eatenFoodIndexSet.clear();

  // We use neighborDist for the grid to keep it efficient.
  // Using the largest neighborDist among species or a sensible default.
  let maxNeighborDist = 0;
  for (let s = 0; s < species.length; s++) {
      maxNeighborDist = Math.max(maxNeighborDist, species[s].neighborDist);
  }
  const cellSize = (maxNeighborDist || boids.neighborDist) * 2.5;

  // Pass 1: Populate spatial hashes
  populateSpatialHash(fishCount, positions, cache, cellSize);
  if (foodCount > 0) {
    populateFoodSpatialHash(foodCount, foodPositions, cache, cellSize);
  }

  // Pass 2: Main loop (Flocking + Boundary + Feeding + Physics)
  for (let i = 0; i < fishCount; i++) {
    const base = i * 3;
    const px = positions[base];
    const py = positions[base + 1];
    const pz = positions[base + 2];

    const vx = velocities[base];
    const vy = velocities[base + 1];
    const vz = velocities[base + 2];

    const modelIdx = modelIndices ? modelIndices[i] : 0;
    const params = (species && species[modelIdx]) || boids;
    const { maxSpeed, maxForce, neighborDist, separationDist, weights } = params;
    const neighborDistSq = neighborDist * neighborDist;
    const separationDistSq = separationDist * separationDist;
    const maxForceDouble = maxForce * 2;

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

    let steerX = sepX + aliX + cohX;
    let steerY = sepY + aliY + cohY;
    let steerZ = sepZ + aliZ + cohZ;

    // --- Soft boundary ---
    const boundDirX = checkBoundViolation(px, bounds.x);
    const boundDirY = checkBoundViolation(py, bounds.y);
    const boundDirZ = checkBoundViolation(pz, bounds.z);

    if (isAnyBoundViolated(boundDirX, boundDirY, boundDirZ)) {
      steerTo(boundDirX, boundDirY, boundDirZ, vx, vy, vz, maxSpeed, maxForceDouble, cache);
      steerX += cache.tempSteer.x;
      steerY += cache.tempSteer.y;
      steerZ += cache.tempSteer.z;
    }

    // --- Feeding ---
    calculateFeeding(
      px, py, pz, vx, vy, vz,
      foodCount, foodPositions,
      maxSpeed, maxForceDouble, cache,
      cellSize,
      cache.tempForce
    );
    steerX += cache.tempForce.x;
    steerY += cache.tempForce.y;
    steerZ += cache.tempForce.z;

    steering[base] = steerX;
    steering[base + 1] = steerY;
    steering[base + 2] = steerZ;

    // --- Physics (Water Current + Drag) ---
    calculateWaterCurrent(px, pz, time, current, cache.tempForce);
    const currX = cache.tempForce.x;
    const currY = cache.tempForce.y;
    const currZ = cache.tempForce.z;

    calculateDragForce(vx, vy, vz, water, cache.tempForce);

    externalForces[base] = currX + cache.tempForce.x;
    externalForces[base + 1] = currY + cache.tempForce.y;
    externalForces[base + 2] = currZ + cache.tempForce.z;
  }

  // Return subarrays
  if (outputTarget) {
    const sharedEatenFoodIndices = outputTarget.eatenFoodIndices;
    const eatenFoodCount = Math.min(eatenFoodIndices.length, sharedEatenFoodIndices.length);

    for (let i = 0; i < eatenFoodCount; i++) {
      sharedEatenFoodIndices[i] = eatenFoodIndices[i];
    }
    if (outputTarget.eatenFoodCount) {
      outputTarget.eatenFoodCount[0] = eatenFoodCount;
    }

    return {
      snapshotRevision: input.snapshotRevision,
      steering,
      externalForces,
      eatenFoodIndices: sharedEatenFoodIndices.subarray(0, eatenFoodCount),
    };
  }

  return {
    snapshotRevision: input.snapshotRevision,
    steering: steering.subarray(0, fishCount * 3),
    externalForces: externalForces.subarray(0, fishCount * 3),
    eatenFoodIndices,
  };
}
