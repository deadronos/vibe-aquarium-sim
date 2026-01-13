/**
 * Checks if a coordinate exceeds a limit.
 * Returns 1 if < -limit, -1 if > limit, 0 otherwise.
 */
export function checkBoundViolation(value: number, limit: number): number {
  if (value < -limit) return 1;
  if (value > limit) return -1;
  return 0;
}

/**
 * Helper to determine if any boundary was violated.
 */
export function isAnyBoundViolated(xViolation: number, yViolation: number, zViolation: number): boolean {
  return xViolation !== 0 || yViolation !== 0 || zViolation !== 0;
}
