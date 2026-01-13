import type { SimulationInput, SimulationOutput } from './types';
import { getBoidsCache } from './cache';
import { populateSpatialHash } from './spatialHash';
import { steerTo } from './steering';
import { calculateFeeding } from './feeding';
import { calculateDragForce, calculateWaterCurrent } from '../../utils/physicsMath';
import { checkBoundViolation, isAnyBoundViolated } from '../../utils/boundaryMath';

export function simulateStep(input: SimulationInput): SimulationOutput {
  const {
    fishCount,
    positions,
    velocities,
    foodCount,
    foodPositions,
    time,
    boids,
    bounds,
    water,
    current,
  } = input;

  const cache = getBoidsCache(fishCount);
  const { HASH_MASK, EPS, tempSteer, cellHead, cellNext, steering, externalForces, eatenFoodIndices } = cache;

  // Zero-fill buffers
  steering.fill(0, 0, fishCount * 3);
  externalForces.fill(0, 0, fishCount * 3);

  // Clear eaten food indices
  eatenFoodIndices.length = 0;

  const neighborDist = boids.neighborDist;
  const separationDist = boids.separationDist;
  const maxSpeed = boids.maxSpeed;
  const maxForce = boids.maxForce;
  const maxForceDouble = maxForce * 2;
  const neighborDistSq = neighborDist * neighborDist;
  const separationDistSq = separationDist * separationDist;

  const cellSize = neighborDist * 2.5;

  // Pass 1: Populate spatial hash
  populateSpatialHash(fishCount, positions, cache, cellSize);

  // Pass 2: Main loop (Flocking + Boundary + Feeding + Physics)
  for (let i = 0; i < fishCount; i++) {
    const base = i * 3;
    const px = positions[base];
    const py = positions[base + 1];
    const pz = positions[base + 2];

    const vx = velocities[base];
    const vy = velocities[base + 1];
    const vz = velocities[base + 2];

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
        sepX = tempSteer.x;
        sepY = tempSteer.y;
        sepZ = tempSteer.z;
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
      aliX = tempSteer.x;
      aliY = tempSteer.y;
      aliZ = tempSteer.z;

      // Cohesion
      cohX = cohX / count - px;
      cohY = cohY / count - py;
      cohZ = cohZ / count - pz;
      steerTo(cohX, cohY, cohZ, vx, vy, vz, maxSpeed, maxForce, cache);
      cohX = tempSteer.x;
      cohY = tempSteer.y;
      cohZ = tempSteer.z;
    }

    // Apply weights
    sepX *= 2.0;
    sepY *= 2.0;
    sepZ *= 2.0;

    let steerX = sepX + aliX + cohX;
    let steerY = sepY + aliY + cohY;
    let steerZ = sepZ + aliZ + cohZ;

    // --- Soft boundary ---
    const boundDirX = checkBoundViolation(px, bounds.x);
    const boundDirY = checkBoundViolation(py, bounds.y);
    const boundDirZ = checkBoundViolation(pz, bounds.z);

    if (isAnyBoundViolated(boundDirX, boundDirY, boundDirZ)) {
      steerTo(boundDirX, boundDirY, boundDirZ, vx, vy, vz, maxSpeed, maxForceDouble, cache);
      steerX += tempSteer.x;
      steerY += tempSteer.y;
      steerZ += tempSteer.z;
    }

    // --- Feeding ---
    const feedForce = calculateFeeding(
      px, py, pz, vx, vy, vz,
      foodCount, foodPositions,
      maxSpeed, maxForceDouble, cache
    );
    steerX += feedForce.x;
    steerY += feedForce.y;
    steerZ += feedForce.z;

    steering[base] = steerX;
    steering[base + 1] = steerY;
    steering[base + 2] = steerZ;

    // --- Physics (Water Current + Drag) ---
    const currentForce = calculateWaterCurrent(px, pz, time, current);
    const dragForce = calculateDragForce(vx, vy, vz, water);

    externalForces[base] = currentForce.x + dragForce.x;
    externalForces[base + 1] = currentForce.y + dragForce.y;
    externalForces[base + 2] = currentForce.z + dragForce.z;
  }

  // Return subarrays
  return {
    steering: steering.subarray(0, fishCount * 3),
    externalForces: externalForces.subarray(0, fishCount * 3),
    eatenFoodIndices,
  };
}
