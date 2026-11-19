import { describe, expect, it } from 'vitest';
import { resolveCapsulePenetrations } from '../src/sim/collision';
import type { CapsuleObstacle } from '../src/sim/aquascape';

const capsule = (
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number
): CapsuleObstacle => ({
  kind: 'capsule',
  ax,
  ay,
  az,
  bx,
  by,
  bz,
  x: (ax + bx) / 2,
  y: (ay + by) / 2,
  z: (az + bz) / 2,
  radius: 0.02,
});

const distanceTo = (position: Float32Array, obstacle: CapsuleObstacle) => {
  const sx = obstacle.bx - obstacle.ax;
  const sy = obstacle.by - obstacle.ay;
  const sz = obstacle.bz - obstacle.az;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((position[0]! - obstacle.ax) * sx +
        (position[1]! - obstacle.ay) * sy +
        (position[2]! - obstacle.az) * sz) /
        (sx * sx + sy * sy + sz * sz)
    )
  );
  return Math.hypot(
    position[0]! - (obstacle.ax + sx * t),
    position[1]! - (obstacle.ay + sy * t),
    position[2]! - (obstacle.az + sz * t)
  );
};

describe('capsule collision', () => {
  it('rechecks overlapping capsules so a later correction cannot re-enter an earlier one', () => {
    const obstacles = [
      capsule(-0.0365635756, 0.0347433737, 0, 0.0263774619, -0.0244930974, 0),
      capsule(-0.0004564913, -0.0050508935, 0, 0.0151592973, 0.0288723351, 0),
      capsule(-0.0406140413, -0.0471652523, 0, 0.0335765104, -0.0067232932, 0),
    ];
    const position = new Float32Array(3);
    const velocity = new Float32Array([0.01, 0, 0]);

    resolveCapsulePenetrations(position, velocity, 0, 0.075, obstacles);

    for (const obstacle of obstacles) {
      expect(distanceTo(position, obstacle)).toBeGreaterThanOrEqual(0.035 - 1e-6);
    }
  });
});
