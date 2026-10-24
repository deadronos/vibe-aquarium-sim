import { describe, expect, it } from 'vitest';
import { SWIM_BOUNDS, TANK, substrateHeight } from '../src/config/scene';
import { FOOD_CAPACITY, FoodPool } from '../src/sim/food';
import { createRandom } from '../src/sim/random';

describe('FoodPool', () => {
  it('sprinkles flakes onto the water surface', () => {
    const food = new FoodPool(createRandom(1));
    food.sprinkle(0.1, 0, 5);
    expect(food.activeCount).toBe(5);
    for (let i = 0; i < 5; i++) expect(food.pos[i * 3 + 1]).toBeCloseTo(TANK.waterLevel, 1);
  });

  it('lets flakes sink and settle on the sand', () => {
    const food = new FoodPool(createRandom(1));
    food.sprinkle(0, 0, 1);
    for (let t = 0; t < 30; t += 1 / 30) food.step(1 / 30, t);
    const x = food.pos[0]!;
    const z = food.pos[2]!;
    expect(food.pos[1]).toBeCloseTo(substrateHeight(x, z) + 0.004, 3);
  });

  it('dissolves uneaten flakes eventually', () => {
    const food = new FoodPool(createRandom(1));
    food.sprinkle(0, 0, 3);
    for (let t = 0; t < 60; t += 0.5) food.step(0.5, t);
    expect(food.activeCount).toBe(0);
  });

  it('recycles the oldest flakes instead of growing', () => {
    const food = new FoodPool(createRandom(1));
    for (let i = 0; i < 20; i++) food.sprinkle(0, 0, 9);
    expect(food.activeCount).toBe(FOOD_CAPACITY);
  });

  it('feeds at the same spots for the same seed', () => {
    const feedThrice = (seed: number) => {
      const food = new FoodPool(createRandom(seed));
      for (let n = 0; n < 3; n++) food.feed();
      return Array.from(food.pos);
    };
    expect(feedThrice(7)).toEqual(feedThrice(7));
    expect(feedThrice(7)).not.toEqual(feedThrice(8));
  });

  it('feeds onto the water surface inside the swim bounds', () => {
    const food = new FoodPool(createRandom(3));
    food.feed();
    expect(food.activeCount).toBe(9);
    for (let i = 0; i < 9; i++) {
      expect(food.pos[i * 3]).toBeGreaterThanOrEqual(SWIM_BOUNDS.minX);
      expect(food.pos[i * 3]).toBeLessThanOrEqual(SWIM_BOUNDS.maxX);
      expect(food.pos[i * 3 + 1]).toBeCloseTo(TANK.waterLevel, 1);
    }
  });
});
