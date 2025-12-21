export type SimulationInput = {
  fishCount: number;
  positions: Float32Array;
  velocities: Float32Array;
  foodCount: number;
  foodPositions: Float32Array;
  time: number;
  boids: { neighborDist: number; separationDist: number; maxSpeed: number; maxForce: number };
  bounds: { x: number; y: number; z: number };
  water: { density: number; dragCoefficient: number; crossSectionArea: number };
};

export type SimulationOutput = {
  steering: Float32Array;
  externalForces: Float32Array;
  eatenFoodIndices: number[];
};

// Pure worker kernel: compute boids steering + water forces using numeric math only.
export function simulateStep(input: SimulationInput): SimulationOutput {
  const { fishCount, positions, velocities, foodCount, foodPositions, time, boids, bounds, water } =
    input;

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

  const OFFSET = 5000;
  const STRIDE_Y = 20000;
  const STRIDE_Z = 400000000;

  const buckets = new Map<number, number[]>();

  for (let i = 0; i < fishCount; i++) {
    const base = i * 3;
    const px = positions[base];
    const py = positions[base + 1];
    const pz = positions[base + 2];

    const gx = Math.floor(px / cellSize);
    const gy = Math.floor(py / cellSize);
    const gz = Math.floor(pz / cellSize);
    const key = gx + OFFSET + (gy + OFFSET) * STRIDE_Y + (gz + OFFSET) * STRIDE_Z;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = [];
      buckets.set(key, bucket);
    }
    bucket.push(i);
  }

  const EPS = 1e-6;
  const tempSteer = { x: 0, y: 0, z: 0 };

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
          const key = x + OFFSET + (y + OFFSET) * STRIDE_Y + (z + OFFSET) * STRIDE_Z;
          const bucket = buckets.get(key);
          if (!bucket) continue;
          for (let k = 0; k < bucket.length; k++) {
            const j = bucket[k];
            if (j === i) continue;
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
