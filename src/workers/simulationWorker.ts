type Float32Buffer = Float32Array<ArrayBufferLike>;

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
};

export type SimulationOutput = {
  steering: Float32Buffer;
  externalForces: Float32Buffer;
  eatenFoodIndices: number[];
};

type BoidsCache = {
  HASH_SIZE: number;
  HASH_MASK: number;
  cellHead: Int32Array;
  cellNext: Int32Array;
  tempSteer: { x: number; y: number; z: number };
  EPS: number;
};

type BoidsCacheHost = typeof globalThis & {
  __boidsCache?: BoidsCache;
};

// Pure worker kernel: compute boids steering + water forces using numeric math only.
// Note: This function is serialized and sent to a worker thread by the 'multithreading' library.
// It CANNOT rely on module-level variables or imports that are not explicitly bundled.
// To achieve persistence (avoiding allocation), we attach state to the worker's global scope.
export function simulateStep(input: SimulationInput): SimulationOutput {
  const { fishCount, positions, velocities, foodCount, foodPositions, time, boids, bounds, water } =
    input;

  // Access global scope (self in worker) to store persistent buffers
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
    };
  }

  const cache = ctx.__boidsCache;
  const { HASH_MASK, EPS, tempSteer } = cache;

  // Resize cellNext if necessary
  if (fishCount > cache.cellNext.length) {
    const newCapacity = Math.ceil(fishCount * 1.5);
    cache.cellNext = new Int32Array(newCapacity);
  }

  const cellHead = cache.cellHead;
  const cellNext = cache.cellNext;

  const steering = new Float32Array(fishCount * 3);
  const externalForces = new Float32Array(fishCount * 3);
  const eatenFoodIndices: number[] = [];

  const neighborDist = boids.neighborDist;
  const separationDist = boids.separationDist;
  const maxSpeed = boids.maxSpeed;
  const maxForce = boids.maxForce;
  const maxForceDouble = maxForce * 2;
  const neighborDistSq = neighborDist * neighborDist;
  const separationDistSq = separationDist * separationDist;

  const cellSize = neighborDist * 2.5;

  // Helper function defined inside to capture scope or we could attach to cache too.
  // Defining it here is fine, it's cheap.
  const steerTo = (
    dx: number,
    dy: number,
    dz: number,
    vx: number,
    vy: number,
    vz: number,
    maxSpeedLocal: number,
    maxForceLocal: number
  ) => {
    const lenSq = dx * dx + dy * dy + dz * dz;
    if (lenSq < EPS) {
      tempSteer.x = 0;
      tempSteer.y = 0;
      tempSteer.z = 0;
      return;
    }
    const invLen = 1 / Math.sqrt(lenSq);
    let sx = dx * invLen * maxSpeedLocal;
    let sy = dy * invLen * maxSpeedLocal;
    let sz = dz * invLen * maxSpeedLocal;

    sx -= vx;
    sy -= vy;
    sz -= vz;

    const forceSq = sx * sx + sy * sy + sz * sz;
    if (forceSq > maxForceLocal * maxForceLocal) {
      const scale = maxForceLocal / Math.sqrt(forceSq);
      sx *= scale;
      sy *= scale;
      sz *= scale;
    }

    tempSteer.x = sx;
    tempSteer.y = sy;
    tempSteer.z = sz;
  };

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

  for (let i = 0; i < fishCount; i++) {
    const base = i * 3;
    const px = positions[base];
    const py = positions[base + 1];
    const pz = positions[base + 2];

    const vx = velocities[base];
    const vy = velocities[base + 1];
    const vz = velocities[base + 2];

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
        steerTo(sepX, sepY, sepZ, vx, vy, vz, maxSpeed, maxForce);
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
      steerTo(aliX, aliY, aliZ, vx, vy, vz, maxSpeed, maxForce);
      aliX = tempSteer.x;
      aliY = tempSteer.y;
      aliZ = tempSteer.z;

      // Cohesion
      cohX = cohX / count - px;
      cohY = cohY / count - py;
      cohZ = cohZ / count - pz;
      steerTo(cohX, cohY, cohZ, vx, vy, vz, maxSpeed, maxForce);
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

    // Soft boundary
    let boundX = 0;
    let boundY = 0;
    let boundZ = 0;
    let boundForce = false;

    if (px < -bounds.x) {
      boundX += 1;
      boundForce = true;
    }
    if (px > bounds.x) {
      boundX -= 1;
      boundForce = true;
    }
    if (py < -bounds.y) {
      boundY += 1;
      boundForce = true;
    }
    if (py > bounds.y) {
      boundY -= 1;
      boundForce = true;
    }
    if (pz < -bounds.z) {
      boundZ += 1;
      boundForce = true;
    }
    if (pz > bounds.z) {
      boundZ -= 1;
      boundForce = true;
    }

    if (boundForce) {
      steerTo(boundX, boundY, boundZ, vx, vy, vz, maxSpeed, maxForceDouble);
      steerX += tempSteer.x;
      steerY += tempSteer.y;
      steerZ += tempSteer.z;
    }

    // Feeding logic
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
          eatenFoodIndices.push(closestIndex);
        } else {
          const fBase = closestIndex * 3;
          let seekX = foodPositions[fBase] - px;
          let seekY = foodPositions[fBase + 1] - py;
          let seekZ = foodPositions[fBase + 2] - pz;
          const seekLenSq = seekX * seekX + seekY * seekY + seekZ * seekZ;
          if (seekLenSq > EPS) {
            const invSeek = 1 / Math.sqrt(seekLenSq);
            seekX *= invSeek * maxSpeed;
            seekY *= invSeek * maxSpeed;
            seekZ *= invSeek * maxSpeed;

            seekX -= vx;
            seekY -= vy;
            seekZ -= vz;

            const seekForceSq = seekX * seekX + seekY * seekY + seekZ * seekZ;
            if (seekForceSq > maxForceDouble * maxForceDouble) {
              const scale = maxForceDouble / Math.sqrt(seekForceSq);
              seekX *= scale;
              seekY *= scale;
              seekZ *= scale;
            }

            steerX += seekX;
            steerY += seekY;
            steerZ += seekZ;
          }
        }
      }
    }

    steering[base] = steerX;
    steering[base + 1] = steerY;
    steering[base + 2] = steerZ;

    // Water current
    const strength = 0.03;
    const cx = Math.sin(time * 0.2 + px * 0.5) * 0.5 + Math.cos(time * 0.13 + pz * 0.3) * 0.5;
    const cz = Math.cos(time * 0.2 + pz * 0.5) * 0.5 - Math.sin(time * 0.13 + px * 0.3) * 0.5;
    let currentX = cx;
    let currentY = 0;
    let currentZ = cz;
    const currentLenSq = currentX * currentX + currentZ * currentZ;
    if (currentLenSq < EPS) {
      currentX = 0;
      currentY = 0;
      currentZ = 0;
    } else {
      const invCurrent = 1 / Math.sqrt(currentLenSq);
      currentX *= invCurrent * strength;
      currentZ *= invCurrent * strength;
    }

    // Drag
    const speedSq = vx * vx + vy * vy + vz * vz;
    let dragX = 0;
    let dragY = 0;
    let dragZ = 0;
    if (speedSq >= 0.0001) {
      const dragMagnitude =
        0.5 * water.density * water.dragCoefficient * water.crossSectionArea * speedSq;
      const invSpeed = 1 / Math.sqrt(speedSq);
      dragX = -vx * invSpeed * dragMagnitude;
      dragY = -vy * invSpeed * dragMagnitude;
      dragZ = -vz * invSpeed * dragMagnitude;
    }

    externalForces[base] = currentX + dragX;
    externalForces[base + 1] = currentY + dragY;
    externalForces[base + 2] = currentZ + dragZ;
  }

  return { steering, externalForces, eatenFoodIndices };
}
