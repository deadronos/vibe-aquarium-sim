import { describe, expect, it } from 'vitest';
import { ROOM, SWIM_BOUNDS, TANK, TANK_ORIGIN } from '../src/config/scene';
import { REACH, SHOTS, followPosition, frameFor } from '../src/scene/shots';

const [TX, TY, TZ] = TANK_ORIGIN;
const ASPECTS = [0.3, 0.46, 0.5625, 0.75, 1, 4 / 3, 1.6, 16 / 9, 2.4, 3.5];

/** The room's interior: walls at ±width/2 and ±depth/2, floor at 0, ceiling at height. */
const ROOM_MIN = [-ROOM.width / 2, 0, -ROOM.depth / 2];
const ROOM_MAX = [ROOM.width / 2, ROOM.height, ROOM.depth / 2];

const expectInside = (p: readonly number[], min: readonly number[], max: readonly number[]) => {
  for (let i = 0; i < 3; i++) {
    expect(p[i]).toBeGreaterThanOrEqual(min[i]! - 1e-9);
    expect(p[i]).toBeLessThanOrEqual(max[i]! + 1e-9);
  }
};

describe('camera reach', () => {
  it('is a box strictly inside the room', () => {
    for (let i = 0; i < 3; i++) {
      expect(REACH.min[i]).toBeGreaterThan(ROOM_MIN[i]!);
      expect(REACH.max[i]).toBeLessThan(ROOM_MAX[i]!);
      expect(REACH.min[i]).toBeLessThan(REACH.max[i]!);
    }
  });
});

describe('every camera shot', () => {
  it.each(Object.keys(SHOTS) as (keyof typeof SHOTS)[])(
    '%s looks at a point in the room',
    (name) => {
      const shot = SHOTS[name];
      expectInside(shot.target, ROOM_MIN, ROOM_MAX);
      expect(shot.range).toBeGreaterThan(0);
      expect(shot.bokeh).toBeGreaterThan(0);
    }
  );

  it.each(ASPECTS)('stays inside the room on a %f screen', (aspect) => {
    for (const shot of Object.values(SHOTS)) {
      const { position, fov } = frameFor(shot, aspect);
      expectInside(position, REACH.min, REACH.max);
      expectInside(position, ROOM_MIN, ROOM_MAX);
      expect(fov).toBeGreaterThan(10);
      expect(fov).toBeLessThan(120);
    }
  });

  it('views the tank from in front of the glass', () => {
    for (const name of ['sofa', 'tank', 'glass'] as const) {
      for (const aspect of ASPECTS) {
        expect(frameFor(SHOTS[name], aspect).position[2]).toBeGreaterThan(TZ + TANK.depth / 2);
      }
    }
  });
});

describe('follow camera', () => {
  const out = { x: 0, y: 0, z: 0 };
  const corners: { x: number; y: number; z: number }[] = [];
  for (const x of [SWIM_BOUNDS.minX, SWIM_BOUNDS.maxX])
    for (const y of [SWIM_BOUNDS.minY, SWIM_BOUNDS.maxY])
      for (const z of [SWIM_BOUNDS.minZ, SWIM_BOUNDS.maxZ])
        corners.push({ x: x + TX, y: y + TY, z: z + TZ });

  it('stays inside the room wherever the fish swims', () => {
    for (const fish of corners) {
      const p = followPosition(fish, out);
      expectInside([p.x, p.y, p.z], REACH.min, REACH.max);
    }
  });

  it('stays in front of the glass, a little above the fish', () => {
    for (const fish of corners) {
      followPosition(fish, out);
      expect(out.z).toBeGreaterThanOrEqual(TZ + TANK.depth / 2 + 0.2 - 1e-9);
      expect(out.z).toBeGreaterThan(fish.z);
      expect(out.y).toBeCloseTo(fish.y + 0.06, 9);
      // Pulled towards the middle of the tank.
      expect(Math.abs(out.x - TX)).toBeLessThan(Math.abs(fish.x - TX));
    }
  });

  it('writes into the given vector instead of allocating', () => {
    expect(followPosition(corners[0]!, out)).toBe(out);
  });
});
