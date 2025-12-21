import { Vector3 } from 'three';
import { SIMULATION_BOUNDS, TANK_DIMENSIONS } from '../config/constants';

// Reusable vectors to avoid GC
const tempSteer = new Vector3();

/**
 * Calculates a steering force to keep an entity within the simulation bounds.
 * Returns true if a boundary force was applied.
 * Logic extracted from BoidsSystem.
 */
export function getBoundarySteeringForce(
  position: Vector3,
  velocity: Vector3,
  maxSpeed: number,
  maxForce: number,
  outForce: Vector3
): boolean {
  const { x, y, z } = position;
  tempSteer.set(0, 0, 0);
  let boundForce = false;

  if (x < -SIMULATION_BOUNDS.x) {
    tempSteer.x += 1;
    boundForce = true;
  }
  if (x > SIMULATION_BOUNDS.x) {
    tempSteer.x -= 1;
    boundForce = true;
  }
  if (y < -SIMULATION_BOUNDS.y) {
    tempSteer.y += 1;
    boundForce = true;
  }
  if (y > SIMULATION_BOUNDS.y) {
    tempSteer.y -= 1;
    boundForce = true;
  }
  if (z < -SIMULATION_BOUNDS.z) {
    tempSteer.z += 1;
    boundForce = true;
  }
  if (z > SIMULATION_BOUNDS.z) {
    tempSteer.z -= 1;
    boundForce = true;
  }

  if (boundForce) {
    tempSteer.normalize().multiplyScalar(maxSpeed);
    tempSteer.sub(velocity).clampLength(0, maxForce * 2);
    outForce.add(tempSteer);
    return true;
  }

  return false;
}

/**
 * Clamps a position to be within the tank dimensions minus a margin.
 * If clamped, it also reflects the velocity (bounce).
 * Logic extracted from Fish.tsx.
 */
export function clampPositionToTank(
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number },
  margin = 0.1
): {
  clamped: boolean;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
} {
  const limitX = TANK_DIMENSIONS.width / 2 - margin;
  const limitY = TANK_DIMENSIONS.height / 2 - margin;
  const limitZ = TANK_DIMENSIONS.depth / 2 - margin;

  let cx = position.x;
  let cy = position.y;
  let cz = position.z;
  let vx = velocity.x;
  let vy = velocity.y;
  let vz = velocity.z;

  let clamped = false;

  if (Math.abs(cx) > limitX) {
    cx = Math.sign(cx) * limitX;
    vx *= -0.5; // Bounce back
    clamped = true;
  }
  if (Math.abs(cy) > limitY) {
    cy = Math.sign(cy) * limitY;
    vy *= -0.5;
    clamped = true;
  }
  if (Math.abs(cz) > limitZ) {
    cz = Math.sign(cz) * limitZ;
    vz *= -0.5;
    clamped = true;
  }

  // Return new objects or the same values?
  // Since we are returning a struct, we return the values.
  // The caller should apply them.
  return {
    clamped,
    position: { x: cx, y: cy, z: cz },
    velocity: { x: vx, y: vy, z: vz },
  };
}
