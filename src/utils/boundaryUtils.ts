import { TANK_DIMENSIONS } from '../config/constants';

export type Vec3Like = { x: number; y: number; z: number };

const HALF_TANK_WIDTH = TANK_DIMENSIONS.width / 2;
const HALF_TANK_HEIGHT = TANK_DIMENSIONS.height / 2;
const HALF_TANK_DEPTH = TANK_DIMENSIONS.depth / 2;

/**
 * Clamps a position to be within the tank dimensions minus a margin.
 * If clamped, it also reflects the velocity (bounce).
 * Logic extracted from Fish.tsx.
 */
export function clampPositionToTank(
  position: Vec3Like,
  velocity: Vec3Like,
  outPosition: Vec3Like,
  outVelocity: Vec3Like,
  margin = 0.1
): boolean {
  const limitX = HALF_TANK_WIDTH - margin;
  const limitY = HALF_TANK_HEIGHT - margin;
  const limitZ = HALF_TANK_DEPTH - margin;

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

  outPosition.x = cx;
  outPosition.y = cy;
  outPosition.z = cz;

  outVelocity.x = vx;
  outVelocity.y = vy;
  outVelocity.z = vz;

  return clamped;
}
