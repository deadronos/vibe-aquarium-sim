import { describe, expect, it } from 'vitest';
import { SWIM_BOUNDS, substrateHeight } from '../src/config/scene';
import { ANEMONE, DRIFTWOOD_PATHS, OBSTACLES, REST_SPOTS } from '../src/sim/aquascape';
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

/** The default species mix, scaled to `total` fish. */
const crowd = (total: number) => {
  const usual = SPECIES.reduce((n, s) => n + s.count, 0);
  let left = total;
  return SPECIES.map((s, k) => {
    const count = k === SPECIES.length - 1 ? left : Math.round((s.count * total) / usual);
    left -= count;
    return { ...s, count };
  });
};

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

  it.each(['ordinary', 'feeding', 'startle'])(
    'projects a fish clear of a branch during %s motion',
    (motion) => {
      const one = [{ ...SPECIES[0]!, count: 1 }];
      const school = new FishSchool(one, createRandom(8));
      const food = new FoodPool(createRandom(9));
      const env = { activity: 1, food, obstacles: OBSTACLES, viewer: 0 };
      const branch = DRIFTWOOD_PATHS[1]!;
      const [ax, ay, az] = branch.points[1]!;
      const [bx, by, bz] = branch.points[2]!;
      const px = (ax + bx) / 2;
      const py = (ay + by) / 2;
      const pz = (az + bz) / 2;
      school.pos.set([px, py, pz], 0);
      school.vel.set([0.01, 0, 0.01], 0);
      if (motion === 'feeding') {
        food.sprinkle(bx, bz, 1);
        school.hunger[0] = 1;
      } else if (motion === 'startle') {
        school.startle(px - 0.02, py, pz);
      }

      run(school, env, 1);
      const tx = school.pos[0]! - ax;
      const ty = school.pos[1]! - ay;
      const tz = school.pos[2]! - az;
      const dx = bx - ax;
      const dy = by - ay;
      const dz = bz - az;
      const t = Math.max(
        0,
        Math.min(1, (tx * dx + ty * dy + tz * dz) / (dx * dx + dy * dy + dz * dz))
      );
      const clearance = Math.hypot(
        school.pos[0]! - (ax + dx * t),
        school.pos[1]! - (ay + dy * t),
        school.pos[2]! - (az + dz * t)
      );
      expect(clearance).toBeGreaterThan(branch.radiusEnd);
    }
  );

  it('keeps overlap projections clear of every driftwood capsule', () => {
    const capsules = OBSTACLES.filter((obstacle) => obstacle.kind === 'capsule');
    let worstPenetration = 0;
    for (const capsule of capsules) {
      for (const along of [0, 0.25, 0.5, 0.75, 1]) {
        const one = [{ ...SPECIES[0]!, count: 1 }];
        const school = new FishSchool(one, createRandom(19));
        const env = {
          activity: 1,
          food: new FoodPool(createRandom(23)),
          obstacles: OBSTACLES,
          viewer: 0,
        };
        const ax = capsule.ax + (capsule.bx - capsule.ax) * along;
        const ay = capsule.ay + (capsule.by - capsule.ay) * along;
        const az = capsule.az + (capsule.bz - capsule.az) * along;
        school.pos.set([ax, ay, az], 0);
        school.vel.set([0.01, 0, 0], 0);
        school.step(STEP, env);

        for (const other of capsules) {
          const sx = other.bx - other.ax;
          const sy = other.by - other.ay;
          const sz = other.bz - other.az;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((school.pos[0]! - other.ax) * sx +
                (school.pos[1]! - other.ay) * sy +
                (school.pos[2]! - other.az) * sz) /
                (sx * sx + sy * sy + sz * sz)
            )
          );
          const distance = Math.hypot(
            school.pos[0]! - (other.ax + sx * t),
            school.pos[1]! - (other.ay + sy * t),
            school.pos[2]! - (other.az + sz * t)
          );
          worstPenetration = Math.max(
            worstPenetration,
            other.radius + one[0]!.length * 0.2 - distance
          );
        }
      }
    }
    expect(worstPenetration).toBeLessThan(1e-6);
  });

  it('preserves driftwood clearance when a projected fish is constrained by the substrate', () => {
    const one = [{ ...SPECIES[0]!, count: 1 }];
    const school = new FishSchool(one, createRandom(31));
    const food = new FoodPool(createRandom(32));
    const env = { activity: 1, food, obstacles: OBSTACLES, viewer: 0 };
    school.pos.set([0.116, 0.0902, -0.13], 0);
    school.vel.set([0.01, 0, 0], 0);
    school.step(STEP, env);

    let worstPenetration = 0;
    let worstObstacle = '';
    for (const obstacle of OBSTACLES) {
      if (obstacle.kind !== 'capsule') continue;
      const sx = obstacle.bx - obstacle.ax;
      const sy = obstacle.by - obstacle.ay;
      const sz = obstacle.bz - obstacle.az;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((school.pos[0]! - obstacle.ax) * sx +
            (school.pos[1]! - obstacle.ay) * sy +
            (school.pos[2]! - obstacle.az) * sz) /
            (sx * sx + sy * sy + sz * sz)
        )
      );
      const distance = Math.hypot(
        school.pos[0]! - (obstacle.ax + sx * t),
        school.pos[1]! - (obstacle.ay + sy * t),
        school.pos[2]! - (obstacle.az + sz * t)
      );
      const penetration = obstacle.radius + one[0]!.length * 0.2 - distance;
      if (penetration > worstPenetration) {
        worstPenetration = penetration;
        worstObstacle = JSON.stringify(obstacle);
      }
    }
    expect(worstPenetration, `${JSON.stringify([...school.pos])} ${worstObstacle}`).toBeLessThan(
      1e-5
    );
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

  describe('neighbour search', () => {
    it('checks every pair in the default tank', () => {
      expect(new FishSchool(SPECIES, createRandom(1)).usesGrid).toBe(false);
      expect(new FishSchool(crowd(250), createRandom(1)).usesGrid).toBe(true);
    });

    it('finds the same neighbours through the grid as by checking every pair', () => {
      const swim = (gridFrom: number) => {
        // 120 fish: the clownfish find mates through their own grid, the others from their list.
        const school = new FishSchool(crowd(120), createRandom(8), { gridFrom });
        const food = new FoodPool(createRandom(9));
        const env = { activity: 1, food, obstacles: OBSTACLES, viewer: 0 };
        food.sprinkle(0, 0, 10);
        run(school, env, 1);
        school.startle(0, 0.25, SWIM_BOUNDS.maxZ);
        run(school, env, 1);
        return school;
      };
      const grid = swim(0);
      const pairs = swim(Infinity);
      expect(grid.usesGrid).toBe(true);
      expect(pairs.usesGrid).toBe(false);
      expect(Array.from(grid.pos)).toEqual(Array.from(pairs.pos));
      expect(Array.from(grid.vel)).toEqual(Array.from(pairs.vel));
      expect(Array.from(grid.yaw)).toEqual(Array.from(pairs.yaw));
    });

    it('checks about the same number of pairs per fish as the school grows', () => {
      // Fish spread evenly through the water, one step each: the distance checks are an exact,
      // seeded count, so this stays quick (and steady) under coverage.
      const perFish = (total: number) => {
        const school = new FishSchool(crowd(total), createRandom(3), { gridFrom: 0 });
        const env = {
          activity: 1,
          food: new FoodPool(createRandom(4)),
          obstacles: OBSTACLES,
          viewer: 0,
        };
        const random = createRandom(5);
        for (let i = 0; i < total; i++) {
          school.pos[i * 3] = random.range(SWIM_BOUNDS.minX, SWIM_BOUNDS.maxX);
          school.pos[i * 3 + 1] = random.range(SWIM_BOUNDS.minY + 0.1, SWIM_BOUNDS.maxY);
          school.pos[i * 3 + 2] = random.range(SWIM_BOUNDS.minZ, SWIM_BOUNDS.maxZ);
        }
        school.step(STEP, env);
        expect(Array.from(school.pos).every(Number.isFinite)).toBe(true);
        return school.pairChecks / total;
      };
      const small = perFish(100);
      // Checking every pair would cost 5 and 10 times as much per fish as at 100 fish.
      expect(perFish(500) / small).toBeLessThan(2.5);
      expect(perFish(1000) / small).toBeLessThan(3.5);
      expect(perFish(500)).toBeLessThan(0.25 * 499);
    });
  });
});
