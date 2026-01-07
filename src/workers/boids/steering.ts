import type { BoidsCache } from './types';

// Helper for applying steering forces
export function steerTo(
  dx: number,
  dy: number,
  dz: number,
  vx: number,
  vy: number,
  vz: number,
  maxSpeedLocal: number,
  maxForceLocal: number,
  cache: BoidsCache
): void {
  const { EPS, tempSteer } = cache;
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
}
