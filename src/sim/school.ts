import { SWIM_BOUNDS, substrateHeight } from '../config/scene';
import type { Obstacle } from './aquascape';
import type { FoodPool } from './food';
import { FOOD_CAPACITY } from './food';
import type { Random } from './random';
import type { Species } from './species';

const TAU = Math.PI * 2;
const EDGE_MARGIN = 0.07;

export interface SchoolEnvironment {
  /** 0..1 — fish slow down and settle low at night. */
  activity: number;
  food: FoodPool;
  obstacles: readonly Obstacle[];
}

/**
 * Struct-of-arrays boids school in tank-local space. Every per-frame path is allocation-free.
 * Orientation (yaw/pitch/roll) is smoothed here so the renderer only composes matrices.
 */
export class FishSchool {
  readonly count: number;
  readonly species: Uint8Array;
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  readonly yaw: Float32Array;
  readonly pitch: Float32Array;
  readonly roll: Float32Array;
  readonly scale: Float32Array;
  /** Tail-beat phase in radians, advanced faster when swimming faster. */
  readonly phase: Float32Array;
  /** 0..1 tail-beat strength, higher when accelerating. */
  readonly effort: Float32Array;
  readonly hunger: Float32Array;
  private readonly wanderYaw: Float32Array;
  private readonly wanderPitch: Float32Array;
  readonly speciesList: readonly Species[];
  private readonly random: Random;

  constructor(speciesList: readonly Species[], random: Random) {
    this.speciesList = speciesList;
    this.random = random;
    this.count = speciesList.reduce((sum, s) => sum + s.count, 0);
    const n = this.count;
    this.species = new Uint8Array(n);
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.yaw = new Float32Array(n);
    this.pitch = new Float32Array(n);
    this.roll = new Float32Array(n);
    this.scale = new Float32Array(n);
    this.phase = new Float32Array(n);
    this.effort = new Float32Array(n);
    this.hunger = new Float32Array(n);
    this.wanderYaw = new Float32Array(n);
    this.wanderPitch = new Float32Array(n);

    let i = 0;
    speciesList.forEach((species, s) => {
      // Each species starts as a loose group so schools are visible from the first frame.
      const cx = random.range(SWIM_BOUNDS.minX + 0.15, SWIM_BOUNDS.maxX - 0.15);
      for (let k = 0; k < species.count; k++, i++) {
        const o = i * 3;
        this.species[i] = s;
        this.pos[o] = cx + random.range(-0.12, 0.12);
        this.pos[o + 1] =
          lerp(SWIM_BOUNDS.minY + 0.06, SWIM_BOUNDS.maxY, species.preferredHeight) +
          random.range(-0.05, 0.05);
        this.pos[o + 2] = random.range(SWIM_BOUNDS.minZ + 0.05, SWIM_BOUNDS.maxZ - 0.05);
        const heading = random.range(0, TAU);
        this.wanderYaw[i] = heading;
        this.yaw[i] = heading;
        this.vel[o] = Math.sin(heading) * species.cruiseSpeed;
        this.vel[o + 2] = Math.cos(heading) * species.cruiseSpeed;
        this.scale[i] = species.length * random.range(0.85, 1.12);
        this.phase[i] = random.range(0, TAU);
        this.hunger[i] = random.range(0.3, 1);
      }
    });
  }

  step(dt: number, env: SchoolEnvironment) {
    const { pos, vel } = this;
    const activity = env.activity;
    const food = env.food;

    for (let i = 0; i < this.count; i++) {
      const sp = this.speciesList[this.species[i]!]!;
      const o = i * 3;
      const px = pos[o]!;
      const py = pos[o + 1]!;
      const pz = pos[o + 2]!;
      const vx = vel[o]!;
      const vy = vel[o + 1]!;
      const vz = vel[o + 2]!;
      const cruise = sp.cruiseSpeed * (0.35 + 0.65 * activity);
      let ax = 0;
      let ay = 0;
      let az = 0;

      // Wander: a slowly drifting preferred heading.
      this.wanderYaw[i] = this.wanderYaw[i]! + this.random.range(-1, 1) * dt * 1.2;
      this.wanderPitch[i] = clamp(
        this.wanderPitch[i]! + this.random.range(-1, 1) * dt * 0.6,
        -0.35,
        0.35
      );
      const wy = this.wanderYaw[i]!;
      const wp = this.wanderPitch[i]!;
      ax += (Math.sin(wy) * Math.cos(wp) * cruise - vx) * 0.5;
      ay += (Math.sin(wp) * cruise * 0.5 - vy) * 0.5;
      az += (Math.cos(wy) * Math.cos(wp) * cruise - vz) * 0.5;

      // Separation from everyone; alignment and cohesion with the same species.
      let sx = 0;
      let sy = 0;
      let sz = 0;
      let alx = 0;
      let aly = 0;
      let alz = 0;
      let cx = 0;
      let cy = 0;
      let cz = 0;
      let mates = 0;
      const personal = sp.length * 1.3;
      const neighbourhood = sp.length * 7;
      for (let j = 0; j < this.count; j++) {
        if (j === i) continue;
        const q = j * 3;
        const dx = pos[q]! - px;
        const dy = pos[q + 1]! - py;
        const dz = pos[q + 2]! - pz;
        const d2 = dx * dx + dy * dy + dz * dz + 1e-6;
        const otherLength = this.speciesList[this.species[j]!]!.length;
        const space = (personal + otherLength * 1.3) * 0.5;
        if (d2 < space * space) {
          const inv = (space - Math.sqrt(d2)) / (space * Math.sqrt(d2));
          sx -= dx * inv;
          sy -= dy * inv;
          sz -= dz * inv;
        }
        if (this.species[j] === this.species[i] && d2 < neighbourhood * neighbourhood) {
          alx += vel[q]!;
          aly += vel[q + 1]!;
          alz += vel[q + 2]!;
          cx += dx;
          cy += dy;
          cz += dz;
          mates++;
        }
      }
      ax += sx * cruise * 3;
      ay += sy * cruise * 3;
      az += sz * cruise * 3;
      if (mates > 0) {
        const k = sp.schooling / mates;
        ax += (alx * k - vx * sp.schooling) * 0.6 + cx * k * 0.25;
        ay += (aly * k - vy * sp.schooling) * 0.6 + cy * k * 0.25;
        az += (alz * k - vz * sp.schooling) * 0.6 + cz * k * 0.25;
      }

      // Preferred depth; at night everyone settles towards the lower third.
      const heightPref = sp.preferredHeight * (0.4 + 0.6 * activity);
      ay += (lerp(SWIM_BOUNDS.minY, SWIM_BOUNDS.maxY, heightPref) - py) * 0.12;

      // Food: hungry fish dart to the nearest flake.
      if (food.activeCount > 0 && this.hunger[i]! > 0.25) {
        let best = -1;
        let bestD2 = 0.5 * 0.5;
        for (let f = 0; f < FOOD_CAPACITY; f++) {
          if (!food.active[f]) continue;
          const q = f * 3;
          const dx = food.pos[q]! - px;
          const dy = food.pos[q + 1]! - py;
          const dz = food.pos[q + 2]! - pz;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < bestD2) {
            bestD2 = d2;
            best = f;
          }
        }
        if (best >= 0) {
          const q = best * 3;
          const d = Math.sqrt(bestD2) + 1e-5;
          const chase = sp.maxSpeed * 0.8;
          ax += (((food.pos[q]! - px) / d) * chase - vx) * 2.2;
          ay += (((food.pos[q + 1]! - py) / d) * chase - vy) * 2.2;
          az += (((food.pos[q + 2]! - pz) / d) * chase - vz) * 2.2;
          if (d < sp.length * 0.45) {
            food.consume(best);
            this.hunger[i] = Math.max(0, this.hunger[i]! - 0.34);
          }
        }
      }
      this.hunger[i] = Math.min(1, this.hunger[i]! + dt / 90);

      // Soft walls, substrate and water surface.
      const floor = Math.max(SWIM_BOUNDS.minY, substrateHeight(px, pz) + 0.035);
      ax += edge(px - SWIM_BOUNDS.minX) - edge(SWIM_BOUNDS.maxX - px);
      ay += edge(py - floor) - edge(SWIM_BOUNDS.maxY - py);
      az += edge(pz - SWIM_BOUNDS.minZ) - edge(SWIM_BOUNDS.maxZ - pz);

      // Rocks and driftwood.
      for (let k = 0; k < env.obstacles.length; k++) {
        const ob = env.obstacles[k]!;
        const dx = px - ob.x;
        const dy = py - ob.y;
        const dz = pz - ob.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-5;
        const reach = ob.radius + sp.length * 0.6;
        if (d < reach) {
          const push = ((reach - d) / reach) * 1.4;
          ax += (dx / d) * push;
          ay += (dy / d) * push;
          az += (dz / d) * push;
        }
      }

      const maxAccel = sp.maxSpeed * 2;
      const aLen = Math.sqrt(ax * ax + ay * ay + az * az);
      if (aLen > maxAccel) {
        const s = maxAccel / aLen;
        ax *= s;
        ay *= s;
        az *= s;
      }

      let nvx = vx + ax * dt;
      let nvy = vy + ay * dt;
      let nvz = vz + az * dt;
      // Fish swim mostly level: cap the climb angle.
      const horizontal = Math.sqrt(nvx * nvx + nvz * nvz);
      const maxClimb = horizontal * 0.55 + 0.004;
      nvy = clamp(nvy, -maxClimb, maxClimb);
      const speed = Math.sqrt(nvx * nvx + nvy * nvy + nvz * nvz) + 1e-6;
      const minSpeed = cruise * 0.35;
      const targetSpeed = clamp(speed, minSpeed, sp.maxSpeed);
      const sc = targetSpeed / speed;
      nvx *= sc;
      nvy *= sc;
      nvz *= sc;
      vel[o] = nvx;
      vel[o + 1] = nvy;
      vel[o + 2] = nvz;

      pos[o] = clamp(px + nvx * dt, SWIM_BOUNDS.minX, SWIM_BOUNDS.maxX);
      pos[o + 1] = clamp(py + nvy * dt, floor - 0.01, SWIM_BOUNDS.maxY);
      pos[o + 2] = clamp(pz + nvz * dt, SWIM_BOUNDS.minZ, SWIM_BOUNDS.maxZ);

      // Smoothed orientation; roll into turns like a banking fish.
      const targetYaw = Math.atan2(nvx, nvz);
      const yawDelta = wrapAngle(targetYaw - this.yaw[i]!);
      const yawStep = yawDelta * Math.min(1, dt * 4);
      this.yaw[i] = wrapAngle(this.yaw[i]! + yawStep);
      const targetPitch = -Math.asin(clamp(nvy / targetSpeed, -1, 1));
      this.pitch[i] = this.pitch[i]! + (targetPitch - this.pitch[i]!) * Math.min(1, dt * 3);
      const yawRate = dt > 0 ? yawStep / dt : 0;
      const targetRoll = clamp(-yawRate * 0.18, -0.45, 0.45);
      this.roll[i] = this.roll[i]! + (targetRoll - this.roll[i]!) * Math.min(1, dt * 3);

      const effort = clamp(aLen / maxAccel + (targetSpeed - cruise) / sp.maxSpeed, 0, 1);
      this.effort[i] = this.effort[i]! + (effort - this.effort[i]!) * Math.min(1, dt * 2);
      const beatsPerSecond = 0.6 + (targetSpeed / sp.length) * sp.tailBeat * 0.5;
      this.phase[i] = (this.phase[i]! + beatsPerSecond * TAU * dt) % TAU;
    }
  }
}

const edge = (distance: number) =>
  distance < EDGE_MARGIN ? ((EDGE_MARGIN - distance) / EDGE_MARGIN) * 0.6 : 0;
const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const wrapAngle = (a: number) => {
  let r = a;
  while (r > Math.PI) r -= TAU;
  while (r < -Math.PI) r += TAU;
  return r;
};
