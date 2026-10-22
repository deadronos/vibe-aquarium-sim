import { describe, expect, it } from 'vitest';
import { SWIM_BOUNDS, substrateHeight } from '../src/config/scene';
import { OBSTACLES } from '../src/sim/aquascape';
import { FoodPool } from '../src/sim/food';
import { createRandom } from '../src/sim/random';
import { FishSchool } from '../src/sim/school';
import { SPECIES } from '../src/sim/species';

const STEP = 1 / 60;

const simulate = (seconds: number, activity = 1, seed = 1) => {
  const school = new FishSchool(SPECIES, createRandom(seed));
  const food = new FoodPool(createRandom(seed + 1));
  const env = { activity, food, obstacles: OBSTACLES };
  for (let t = 0; t < seconds; t += STEP) {
    school.step(STEP, env);
    food.step(STEP, t);
  }
  return { school, food, env };
};

const averageSpeed = (school: FishSchool) => {
  let total = 0;
  for (let i = 0; i < school.count; i++) {
    total += Math.hypot(school.vel[i * 3]!, school.vel[i * 3 + 1]!, school.vel[i * 3 + 2]!);
  }
  return total / school.count;
};

describe('FishSchool', () => {
  it('spawns every fish of every species', () => {
    const school = new FishSchool(SPECIES, createRandom(1));
    expect(school.count).toBe(SPECIES.reduce((n, s) => n + s.count, 0));
  });

  it('keeps fish inside the water and above the sand', () => {
    const { school } = simulate(90);
    for (let i = 0; i < school.count; i++) {
      const x = school.pos[i * 3]!;
      const y = school.pos[i * 3 + 1]!;
      const z = school.pos[i * 3 + 2]!;
      expect(x).toBeGreaterThanOrEqual(SWIM_BOUNDS.minX);
      expect(x).toBeLessThanOrEqual(SWIM_BOUNDS.maxX);
      expect(z).toBeGreaterThanOrEqual(SWIM_BOUNDS.minZ);
      expect(z).toBeLessThanOrEqual(SWIM_BOUNDS.maxZ);
      expect(y).toBeLessThanOrEqual(SWIM_BOUNDS.maxY);
      expect(y).toBeGreaterThan(substrateHeight(x, z));
      expect(Number.isFinite(school.yaw[i]!)).toBe(true);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = simulate(10, 1, 4).school;
    const b = simulate(10, 1, 4).school;
    expect(Array.from(a.pos)).toEqual(Array.from(b.pos));
  });

  it('swims more slowly at night', () => {
    expect(averageSpeed(simulate(30, 0.3).school)).toBeLessThan(
      averageSpeed(simulate(30, 1).school) * 0.8
    );
  });

  it('eats food sprinkled on the surface', () => {
    const school = new FishSchool(SPECIES, createRandom(3));
    school.hunger.fill(1);
    const food = new FoodPool(createRandom(5));
    const env = { activity: 1, food, obstacles: OBSTACLES };
    food.sprinkle(0, 0, 12);
    expect(food.activeCount).toBe(12);
    for (let t = 0; t < 30; t += STEP) {
      school.step(STEP, env);
      food.step(STEP, t);
    }
    expect(food.activeCount).toBeLessThan(6);
  });

  it('stays clear of rocks and driftwood', () => {
    const { school } = simulate(60);
    for (let i = 0; i < school.count; i++) {
      for (const ob of OBSTACLES) {
        const d = Math.hypot(
          school.pos[i * 3]! - ob.x,
          school.pos[i * 3 + 1]! - ob.y,
          school.pos[i * 3 + 2]! - ob.z
        );
        expect(d).toBeGreaterThan(ob.radius * 0.6);
      }
    }
  });
});
