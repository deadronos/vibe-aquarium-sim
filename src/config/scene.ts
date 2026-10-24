/**
 * World units are metres. The room floor sits at y = 0 and the back wall at z = ROOM.depth / -2.
 * Everything inside the tank is simulated in tank-local space: origin at the centre of the inner
 * floor, +y up, +z towards the viewer.
 */
export const ROOM = {
  width: 6.4,
  depth: 5.2,
  height: 2.7,
} as const;

export const BACK_WALL_Z = -ROOM.depth / 2;

export const CABINET = {
  width: 1.36,
  height: 0.74,
  depth: 0.52,
} as const;

export const TANK = {
  width: 1.2,
  height: 0.52,
  depth: 0.46,
  glass: 0.01,
  /** Height of the water surface above the inner floor. */
  waterLevel: 0.46,
  lidHeight: 0.035,
} as const;

/**
 * World position of the tank's inner floor centre. A plain mutable tuple (not `as const`) so it
 * can be passed straight to a Three.js `position` prop; treat it as read-only.
 */
export const TANK_ORIGIN: [x: number, y: number, z: number] = [
  0,
  CABINET.height + 0.012,
  BACK_WALL_Z + 0.06 + CABINET.depth / 2,
];

/** Swimmable volume in tank-local coordinates (inset from glass, substrate and surface). */
export const SWIM_BOUNDS = {
  minX: -TANK.width / 2 + 0.05,
  maxX: TANK.width / 2 - 0.05,
  minY: 0.07,
  maxY: TANK.waterLevel - 0.04,
  minZ: -TANK.depth / 2 + 0.05,
  maxZ: TANK.depth / 2 - 0.04,
} as const;

/** Substrate (sand) height in tank-local space: sloped up towards the back, as aquascapers do. */
export const substrateHeight = (x: number, z: number): number => {
  const back = (TANK.depth / 2 - z) / TANK.depth; // 0 at front glass, 1 at back glass
  const mound =
    0.012 * Math.exp(-((x + 0.32) ** 2) / 0.05) + 0.01 * Math.exp(-((x - 0.36) ** 2) / 0.04);
  return 0.028 + back * 0.045 + mound * back;
};

export const PALETTE = {
  wall: '#d9d2c5',
  wallAccent: '#5f7464',
  ceiling: '#efebe4',
  trim: '#f3efe8',
  floorWood: '#9a7350',
  cabinet: '#3b2f27',
  cabinetTop: '#4a3b30',
  sofa: '#6d7f86',
  rug: '#b9a58b',
  rugAccent: '#7d5a44',
  brass: '#b58b4c',
  blackMetal: '#1d1d1f',
  plant: '#4e7a46',
  pot: '#c9a98a',
  water: '#1f5d5a',
  waterDeep: '#0d2f33',
  sand: '#c8b08a',
} as const;

/** Window in the left wall (x = -ROOM.width / 2). */
export const WINDOW = {
  width: 1.7,
  height: 1.45,
  centerY: 1.55,
  centerZ: -0.75,
} as const;

/** Floor lamp shade centre, beside the cabinet. */
export const LAMP = { x: 1.3, z: -2.18, shadeY: 1.52 } as const;
