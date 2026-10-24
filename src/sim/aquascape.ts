import { TANK, substrateHeight } from '../config/scene';
import { createRandom } from './random';

/** Static hardscape and planting plan, shared by the renderer and the fish (as obstacles). */
export interface Rock {
  x: number;
  y: number;
  z: number;
  radius: number;
  squash: number;
  yaw: number;
  seed: number;
}

export interface PlantClump {
  kind: 'ribbon' | 'sword' | 'carpet';
  x: number;
  z: number;
  count: number;
  spread: number;
  height: number;
}

const rock = (x: number, z: number, radius: number, squash: number, seed: number): Rock => ({
  x,
  y: substrateHeight(x, z) + radius * squash * 0.35,
  z,
  radius,
  squash,
  yaw: seed * 1.7,
  seed,
});

// An Iwagumi-style arrangement: one main stone left of centre, companions stepping down to the right.
export const ROCKS: readonly Rock[] = [
  rock(-0.2, -0.08, 0.1, 0.95, 1),
  rock(-0.06, -0.02, 0.065, 0.8, 2),
  rock(-0.33, 0.03, 0.055, 0.7, 3),
  rock(0.24, -0.1, 0.075, 0.85, 4),
  rock(0.36, -0.02, 0.045, 0.7, 5),
  rock(0.1, 0.06, 0.03, 0.6, 6),
  rock(-0.44, -0.13, 0.06, 1.1, 7),
];

/** Driftwood branch as a polyline (tank-local), thick end first. */
export const DRIFTWOOD: readonly [number, number, number][] = [
  [0.08, substrateHeight(0.08, -0.12) + 0.015, -0.12],
  [0.19, 0.12, -0.15],
  [0.27, 0.24, -0.17],
  [0.38, 0.31, -0.15],
  [0.47, 0.36, -0.18],
];

export const PLANTS: readonly PlantClump[] = [
  { kind: 'ribbon', x: -0.5, z: -0.17, count: 26, spread: 0.07, height: 0.4 },
  { kind: 'ribbon', x: 0.5, z: -0.16, count: 22, spread: 0.06, height: 0.38 },
  { kind: 'ribbon', x: -0.02, z: -0.19, count: 14, spread: 0.08, height: 0.3 },
  { kind: 'sword', x: 0.36, z: -0.12, count: 9, spread: 0.035, height: 0.2 },
  { kind: 'sword', x: -0.36, z: -0.12, count: 8, spread: 0.035, height: 0.17 },
  { kind: 'carpet', x: 0, z: 0.1, count: 1400, spread: 0.52, height: 0.025 },
];

export interface Obstacle {
  x: number;
  y: number;
  z: number;
  radius: number;
}

const buildObstacles = (): Obstacle[] => {
  const obstacles: Obstacle[] = ROCKS.map((r) => ({
    x: r.x,
    y: r.y,
    z: r.z,
    radius: r.radius * 1.05,
  }));
  for (let i = 0; i < DRIFTWOOD.length - 1; i++) {
    const [ax, ay, az] = DRIFTWOOD[i]!;
    const [bx, by, bz] = DRIFTWOOD[i + 1]!;
    obstacles.push({ x: (ax + bx) / 2, y: (ay + by) / 2, z: (az + bz) / 2, radius: 0.045 });
  }
  return obstacles;
};

export const OBSTACLES: readonly Obstacle[] = buildObstacles();

/** Deterministic scatter used for plant blades. */
export const scatter = (clump: PlantClump, seed: number) => {
  const random = createRandom(seed);
  const points: { x: number; z: number; s: number; r: number }[] = [];
  for (let i = 0; i < clump.count; i++) {
    const angle = random.range(0, Math.PI * 2);
    const dist = Math.sqrt(random.next()) * clump.spread;
    const x = clump.x + Math.cos(angle) * dist * (clump.kind === 'carpet' ? 1 : 1.4);
    const z = clump.z + Math.sin(angle) * dist * (clump.kind === 'carpet' ? 0.35 : 0.6);
    const inside = Math.abs(x) < TANK.width / 2 - 0.02 && Math.abs(z) < TANK.depth / 2 - 0.02;
    if (inside) points.push({ x, z, s: random.range(0.65, 1.15), r: random.range(0, Math.PI * 2) });
  }
  return points;
};

/** The anemone the clownfish host in, planted in the open sand in front of the main stone. */
export const ANEMONE = {
  x: -0.13,
  y: substrateHeight(-0.13, 0.09),
  z: 0.09,
  /** Spread of the tentacle crown. */
  radius: 0.05,
  height: 0.06,
} as const;

export interface RestSpot {
  x: number;
  y: number;
  z: number;
}

const restSpot = (x: number, z: number): RestSpot => ({ x, y: substrateHeight(x, z) + 0.06, z });

/** Low, sheltered spots in front of the tall ribbon plants, clear of the stones, for the night. */
export const REST_SPOTS: readonly RestSpot[] = [
  restSpot(-0.5, 0),
  restSpot(0, -0.13),
  restSpot(0.47, -0.09),
];
