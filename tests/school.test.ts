import { describe, expect, it } from 'vitest';
import { SWIM_BOUNDS, substrateHeight } from '../src/config/scene';
import { ANEMONE, OBSTACLES, REST_SPOTS } from '../src/sim/aquascape';
import { FoodPool } from '../src/sim/food';
import { createRandom } from '../src/sim/random';
import { FishSchool, hungerSlump, restWeight } from '../src/sim/school';
import type { SchoolEnvironment } from '../src/sim/school';
import { SPECIES } from '../src/sim/species';

const STEP = 1 / 60;

const run = (school: FishSchool, env: SchoolEnvironment, seconds: number) => {
  for (let t = 0; t < seconds; t += STEP) {
    school.step(STEP, env);
    env.food.step(STEP, t);
  }
};

const simulate = (seconds: number, activity = 1, seed = 1) => {
  const school = new FishSchool(SPECIES, createRandom(seed));
  const food = new FoodPool(createRandom(seed + 1));
  const env = { activity, food, obstacles: OBSTACLES, viewer: 0 };
  run(school, env, seconds);
  return { school, food, env };
};

const distance = (school: FishSchool, i: number, p: { x: number; y: number; z: number }) =>
  Math.hypot(school.pos[i * 3]! - p.x, school.pos[i * 3 + 1]! - p.y, school.pos[i * 3 + 2]! - p.z);

/** Indices of the fish of one species. */
const ofSpecies = (school: FishSchool, id: string) =>
  Array.from({ length: school.count }, (_, i) => i).filter(
    (i) => school.speciesList[school.species[i]!]!.id === id
  );

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

const anemoneTop = { x: ANEMONE.x, y: ANEMONE.y + ANEMONE.height, z: ANEMONE.z };

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
    const env = { activity: 1, food, obstacles: OBSTACLES, viewer: 0 };
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

  describe('clownfish and their anemone', () => {
    it('stay within a short swim of the anemone by day', () => {
      const { school } = simulate(60);
      const clowns = ofSpecies(school, 'clownfish').map((i) => distance(school, i, anemoneTop));
      const tangs = ofSpecies(school, 'tang').map((i) => distance(school, i, anemoneTop));
      expect(Math.max(...clowns)).toBeLessThan(0.32);
      expect(mean(clowns)).toBeLessThan(mean(tangs));
    });

    it('huddle in it at night', () => {
      const day = simulate(60, 1).school;
      const night = simulate(60, 0.3).school;
      const huddle = (school: FishSchool) =>
        mean(ofSpecies(school, 'clownfish').map((i) => distance(school, i, anemoneTop)));
      expect(huddle(night)).toBeLessThan(0.14);
      expect(huddle(night)).toBeLessThan(huddle(day) * 0.75);
    });
  });

  describe('night rest', () => {
    const nearestRest = (school: FishSchool, i: number) =>
      Math.min(...REST_SPOTS.map((spot) => distance(school, i, spot)));
    const others = (school: FishSchool) => [
      ...ofSpecies(school, 'tang'),
      ...ofSpecies(school, 'angelfish'),
    ];

    it('only kicks in once the tank light is down', () => {
      expect(restWeight(1)).toBe(0);
      expect(restWeight(0.3)).toBe(1);
    });

    it('settles the other fish among the plants', () => {
      const day = simulate(60, 1).school;
      const night = simulate(60, 0.3).school;
      const settled = (school: FishSchool) =>
        mean(others(school).map((i) => nearestRest(school, i)));
      expect(settled(night)).toBeLessThan(0.16);
      expect(settled(night)).toBeLessThan(settled(day) * 0.6);
    });

    it('keeps resting spots clear of rocks and driftwood', () => {
      for (const spot of REST_SPOTS) {
        for (const ob of OBSTACLES) {
          expect(Math.hypot(spot.x - ob.x, spot.y - ob.y, spot.z - ob.z)).toBeGreaterThan(
            ob.radius + 0.04
          );
        }
      }
    });
  });

  describe('the front glass', () => {
    const frontness = (viewer: number) => {
      const school = new FishSchool(SPECIES, createRandom(6));
      const env = {
        activity: 1,
        food: new FoodPool(createRandom(7)),
        obstacles: OBSTACLES,
        viewer,
      };
      school.hunger.fill(0);
      run(school, env, 20);
      return mean(Array.from({ length: school.count }, (_, i) => school.pos[i * 3 + 2]!));
    };

    it('draws curious fish to someone up close', () => {
      expect(frontness(1)).toBeGreaterThan(frontness(0) + 0.04);
    });

    it('draws hungry fish to beg around feeding time', () => {
      const school = new FishSchool(SPECIES, createRandom(6));
      const env = {
        activity: 1,
        food: new FoodPool(createRandom(7)),
        obstacles: OBSTACLES,
        viewer: 0,
      };
      school.hunger.fill(1);
      run(school, env, 20);
      const begging = mean(Array.from({ length: school.count }, (_, i) => school.pos[i * 3 + 2]!));
      expect(begging).toBeGreaterThan(frontness(0) + 0.04);
    });
  });

  describe('a tap on the glass', () => {
    it('sends nearby fish darting away from the glass', () => {
      const { school, env } = simulate(10, 1, 9);
      const tap = { x: 0, y: 0.25, z: SWIM_BOUNDS.maxZ + 0.04 };
      const near = Array.from({ length: school.count }, (_, i) => i).filter(
        (i) => distance(school, i, tap) < 0.35
      );
      expect(near.length).toBeGreaterThan(0);
      const before = near.map((i) => distance(school, i, tap));
      const calm = averageSpeed(school);
      school.startle(tap.x, tap.y, tap.z);
      run(school, env, 0.5);
      expect(averageSpeed(school)).toBeGreaterThan(calm * 1.5);
      near.forEach((i, k) => expect(distance(school, i, tap)).toBeGreaterThan(before[k]!));
    });

    it('wears off within a couple of seconds', () => {
      const { school, env } = simulate(10, 1, 9);
      school.startle(0, 0.25, SWIM_BOUNDS.maxZ);
      run(school, env, 2);
      expect(Array.from(school.startled).every((s) => s === 0)).toBe(true);
    });

    it('leaves fish far from the tap alone', () => {
      const school = new FishSchool(SPECIES, createRandom(1));
      school.startle(10, 10, 10);
      expect(Array.from(school.startled).every((s) => s === 0)).toBe(true);
    });
  });

  describe('hunger', () => {
    it('shows only once a fish is properly hungry', () => {
      expect(hungerSlump(0.5)).toBe(0);
      expect(hungerSlump(0.8)).toBeCloseTo(0.5);
      expect(hungerSlump(1)).toBe(1);
    });

    it('makes fish spot food from further away', () => {
      const reach = (hunger: number) => {
        const school = new FishSchool([{ ...SPECIES[1]!, count: 1 }], createRandom(2));
        const food = new FoodPool(createRandom(3));
        const env = { activity: 1, food, obstacles: OBSTACLES, viewer: 0 };
        school.pos.set([-0.3, 0.3, 0]);
        school.vel.set([0, 0, 0.05]);
        food.sprinkle(0.3, 0, 1);
        const flake = food.active.indexOf(1);
        school.hunger[0] = hunger;
        run(school, env, 1);
        return Math.hypot(
          school.pos[0]! - food.pos[flake * 3]!,
          school.pos[1]! - food.pos[flake * 3 + 1]!,
          school.pos[2]! - food.pos[flake * 3 + 2]!
        );
      };
      expect(reach(1)).toBeLessThan(reach(0.3) - 0.05);
    });

    it('makes fish swim nose-down', () => {
      const posture = (hunger: number) => {
        const school = new FishSchool(SPECIES, createRandom(4));
        const env = {
          activity: 1,
          food: new FoodPool(createRandom(5)),
          obstacles: OBSTACLES,
          viewer: 0,
        };
        let pitch = 0;
        let samples = 0;
        for (let t = 0; t < 10; t += STEP) {
          school.hunger.fill(hunger);
          school.step(STEP, env);
          for (let i = 0; i < school.count; i++) pitch += school.pitch[i]!;
          samples += school.count;
        }
        return pitch / samples;
      };
      expect(posture(1)).toBeGreaterThan(posture(0) + 0.05);
    });
  });
});
