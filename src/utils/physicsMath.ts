// Pure math functions for physics calculations, independent of Three.js or other libraries.

export interface DragParams {
  density: number;
  dragCoefficient: number;
  crossSectionArea: number;
}

export interface CurrentParams {
  strength: number;
  frequency1: number;
  frequency2: number;
  spatialScale1: number;
  spatialScale2: number;
}

/**
 * Calculates the drag force vector components.
 * Returns an object with x, y, z components.
 */
export function calculateDragForce(
  vx: number,
  vy: number,
  vz: number,
  params: DragParams
): { x: number; y: number; z: number } {
  const speedSq = vx * vx + vy * vy + vz * vz;
  if (speedSq < 0.0001) {
    return { x: 0, y: 0, z: 0 };
  }

  const dragMagnitude =
    0.5 * params.density * params.dragCoefficient * params.crossSectionArea * speedSq;
  const invSpeed = 1 / Math.sqrt(speedSq);

  // Drag opposes velocity
  return {
    x: -vx * invSpeed * dragMagnitude,
    y: -vy * invSpeed * dragMagnitude,
    z: -vz * invSpeed * dragMagnitude,
  };
}

/**
 * Calculates the water current vector components at a specific position and time.
 * Returns an object with x, y, z components (y is typically 0 for this simulation).
 */
export function calculateWaterCurrent(
  px: number,
  pz: number,
  time: number,
  params: CurrentParams
): { x: number; y: number; z: number } {
  const { strength, frequency1, frequency2, spatialScale1, spatialScale2 } = params;

  const cx =
    Math.sin(time * frequency1 + px * spatialScale1) * 0.5 +
    Math.cos(time * frequency2 + pz * spatialScale2) * 0.5;
  const cz =
    Math.cos(time * frequency1 + pz * spatialScale1) * 0.5 -
    Math.sin(time * frequency2 + px * spatialScale2) * 0.5;

  let currentX = cx;
  let currentZ = cz;

  const currentLenSq = currentX * currentX + currentZ * currentZ;
  if (currentLenSq < 1e-6) {
    return { x: 0, y: 0, z: 0 };
  }

  const invCurrent = 1 / Math.sqrt(currentLenSq);
  currentX *= invCurrent * strength;
  currentZ *= invCurrent * strength;

  return { x: currentX, y: 0, z: currentZ };
}
