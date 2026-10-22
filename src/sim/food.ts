import { SWIM_BOUNDS, TANK, substrateHeight } from '../config/scene';
import type { Random } from './random';

export const FOOD_CAPACITY = 96;
const FLOAT_TIME = 2.5;
const SINK_SPEED = 0.028;
const LIFETIME = 45;

/** Fixed-size pool of food flakes in tank-local space. */
export class FoodPool {
  readonly pos = new Float32Array(FOOD_CAPACITY * 3);
  readonly age = new Float32Array(FOOD_CAPACITY);
  readonly active = new Uint8Array(FOOD_CAPACITY);
  readonly seed = new Float32Array(FOOD_CAPACITY);
  activeCount = 0;
  private cursor = 0;

  private readonly random: Random;

  constructor(random: Random) {
    this.random = random;
  }

  /** Sprinkles a pinch of flakes onto the water surface around (x, z). */
  sprinkle(x: number, z: number, flakes = 9) {
    for (let n = 0; n < flakes; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % FOOD_CAPACITY;
      if (!this.active[i]) this.activeCount++;
      this.active[i] = 1;
      this.age[i] = 0;
      this.seed[i] = this.random.range(0, Math.PI * 2);
      this.pos[i * 3] = clamp(
        x + this.random.range(-0.06, 0.06),
        SWIM_BOUNDS.minX,
        SWIM_BOUNDS.maxX
      );
      this.pos[i * 3 + 1] = TANK.waterLevel - 0.004;
      this.pos[i * 3 + 2] = clamp(
        z + this.random.range(-0.05, 0.05),
        SWIM_BOUNDS.minZ,
        SWIM_BOUNDS.maxZ
      );
    }
  }

  consume(i: number) {
    if (!this.active[i]) return;
    this.active[i] = 0;
    this.activeCount--;
  }

  step(dt: number, time: number) {
    for (let i = 0; i < FOOD_CAPACITY; i++) {
      if (!this.active[i]) continue;
      const age = (this.age[i] = this.age[i]! + dt);
      if (age > LIFETIME) {
        this.consume(i);
        continue;
      }
      const o = i * 3;
      const s = this.seed[i]!;
      const x = this.pos[o]!;
      const z = this.pos[o + 2]!;
      const floor = substrateHeight(x, z) + 0.004;
      if (age > FLOAT_TIME && this.pos[o + 1]! > floor) {
        // Flakes tumble as they sink, drifting in a lazy spiral.
        this.pos[o + 1] = Math.max(
          floor,
          this.pos[o + 1]! - SINK_SPEED * dt * (0.7 + 0.3 * Math.sin(time * 3 + s))
        );
        this.pos[o] = clamp(
          x + Math.sin(time * 1.3 + s) * 0.012 * dt,
          SWIM_BOUNDS.minX,
          SWIM_BOUNDS.maxX
        );
        this.pos[o + 2] = clamp(
          z + Math.cos(time * 1.1 + s) * 0.012 * dt,
          SWIM_BOUNDS.minZ,
          SWIM_BOUNDS.maxZ
        );
      } else if (age <= FLOAT_TIME) {
        this.pos[o] = clamp(
          x + Math.sin(time * 0.7 + s) * 0.01 * dt,
          SWIM_BOUNDS.minX,
          SWIM_BOUNDS.maxX
        );
      }
    }
  }
}

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
