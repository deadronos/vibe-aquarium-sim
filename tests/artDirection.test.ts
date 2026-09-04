import {
  AQUARIUM_PALETTE,
  ART_DIRECTION_LIGHTING,
  GLASS_MATERIAL,
  DECORATION_CLUSTERS,
  DECORATION_MATERIAL,
  WATER_MATERIAL,
  getDecorationSpawnDescriptors,
  getInitialFishSpawn,
} from '../src/config/artDirection';

describe('aquarium art direction', () => {
  test('exposes a dark teal water palette and a restrained warm accent', () => {
    expect(AQUARIUM_PALETTE.waterDeep).toBe('#123b43');
    expect(AQUARIUM_PALETTE.waterSurface).toBe('#1d5960');
    expect(AQUARIUM_PALETTE.coral).toBe('#c87862');
    expect(AQUARIUM_PALETTE.roomWall).not.toBe('#808080');
  });

  test('returns deterministic clustered decor with a clear central swim lane', () => {
    const first = getDecorationSpawnDescriptors();
    const second = getDecorationSpawnDescriptors();

    expect(first).toEqual(second);
    expect(first).toHaveLength(
      DECORATION_CLUSTERS.reduce((sum, cluster) => sum + cluster.items.length, 0)
    );
    expect(first.every(({ x }) => Math.abs(x) >= 0.42)).toBe(true);

    const counts = first.reduce<Record<string, number>>((result, { type }) => {
      result[type] = (result[type] ?? 0) + 1;
      return result;
    }, {});
    expect(counts.seaweed).toBe(6);
    expect(counts.coral).toBe(4);
    expect(counts.rock).toBe(6);
  });

  test('spreads the default fish opening across the tank and cycles model indices', () => {
    const fish = Array.from({ length: 30 }, (_, index) => getInitialFishSpawn(index, 30));

    expect(new Set(fish.map(({ modelIndex }) => modelIndex))).toEqual(new Set([0, 1, 2]));
    expect(Math.min(...fish.map(({ x }) => x))).toBeLessThan(-0.5);
    expect(Math.max(...fish.map(({ x }) => x))).toBeGreaterThan(0.5);
    expect(fish.every(({ y, z }) => Math.abs(y) < 0.8 && Math.abs(z) < 1.2)).toBe(true);
  });

  test('uses a matte non-metal decoration material language', () => {
    expect(DECORATION_MATERIAL.roughness).toBeGreaterThanOrEqual(0.75);
    expect(DECORATION_MATERIAL.metalness).toBe(0);
    expect(DECORATION_MATERIAL.flatShading).toBe(true);
    expect(DECORATION_MATERIAL.colors).toEqual([
      AQUARIUM_PALETTE.kelp,
      AQUARIUM_PALETTE.rock,
      AQUARIUM_PALETTE.coral,
    ]);
  });

  test('keeps the focal lighting and silhouette materials quality-invariant', () => {
    expect(ART_DIRECTION_LIGHTING.keyIntensity).toBeGreaterThan(
      ART_DIRECTION_LIGHTING.hemisphereIntensity
    );
    expect(WATER_MATERIAL.volumeOpacity).toBeLessThan(0.5);
    expect(GLASS_MATERIAL.standardOpacity).toBeLessThan(0.25);
    expect(AQUARIUM_PALETTE.waterDeep).toBe(AQUARIUM_PALETTE.waterDeep.toLowerCase());
  });
});
