import type { SimulationInput, SimulationOutput, SimulationOutputTarget } from './types';
import { getBoidsCache } from './cache';
import { populateSpatialHash, populateFoodSpatialHash } from './spatialHash';
import { steerTo } from './steering';
import { calculateFeeding } from './feeding';
import { calculateDragForce, calculateWaterCurrent } from '../../utils/physicsMath';
import { checkBoundViolation, isAnyBoundViolated } from '../../utils/boundaryMath';
import { deriveCellSize } from './params';
import { accumulateFlocking } from './flocking';
import { writeSimulationOutput } from './outputWriter';

export function simulateStep(
  input: SimulationInput,
  outputTarget?: SimulationOutputTarget
): SimulationOutput {
  const {
    fishCount,
    positions,
    velocities,
    speciesIndices,
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
  const { eatenFoodIndices } = cache;
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

  const cellSize = deriveCellSize(species, boids);

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

    const speciesIdx = speciesIndices ? speciesIndices[i] : 0;
    const params = (species && species[speciesIdx]) || boids;
    const { maxSpeed, maxForce } = params;
    const maxForceDouble = maxForce * 2;

    // --- Flocking ---
    accumulateFlocking(i, positions, velocities, params, cache, cellSize, cache.tempForce);
    let steerX = cache.tempForce.x;
    let steerY = cache.tempForce.y;
    let steerZ = cache.tempForce.z;

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
      px,
      py,
      pz,
      vx,
      vy,
      vz,
      foodCount,
      foodPositions,
      maxSpeed,
      maxForceDouble,
      cache,
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

  return writeSimulationOutput(
    input.snapshotRevision,
    fishCount,
    steering,
    externalForces,
    eatenFoodIndices,
    outputTarget
  );
}
