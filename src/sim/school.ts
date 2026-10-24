import { SWIM_BOUNDS, substrateHeight } from '../config/scene';
import { ANEMONE, REST_SPOTS } from './aquascape';
import type { Obstacle } from './aquascape';
import type { FoodPool } from './food';
import { FOOD_CAPACITY } from './food';
import type { Random } from './random';
import type { Species } from './species';

const TAU = Math.PI * 2;
const EDGE_MARGIN = 0.07;
/** How far from the anemone clownfish roam by day. */
const HOST_RANGE = 0.22;
/** How long a full-strength startle lasts, in seconds. */
const STARTLE_TIME = 1.4;
/** Fish further than this from a tap on the glass do not react. */
const STARTLE_REACH = 0.7;
/** A fish keeps its distance from this many of the fish closest to it. */
const CLOSEST_SEEN = 6;
/** A fish lines up and stays with this many of its nearest mates, as schooling fish do. */
const MATES_SEEN = 9;
/** Mates further away than this many body lengths are out of sight for schooling. */
const NEIGHBOURHOOD_LENGTHS = 6;
/**
 * From this many fish the nearest neighbours are found through a uniform grid instead of checking
 * every pair. Both searches find exactly the same fish; below this the plain loop is quicker.
 */
const GRID_FROM = 200;
/**
 * The grid is sized for about this many fish per cell on average (smaller cells as the tank
 * fills), and each edge is then stretched to fit the fish exactly.
 */
const GRID_FISH_PER_CELL = 4;
/** Grid cell edges stay within these bounds (metres), whatever the fish count. */
const GRID_CELL_MIN = 0.035;
const GRID_CELL_MAX = 0.12;
/** A species with at most this many fish looks for mates by checking each one, not by grid. */
const MATES_BY_LIST = 48;
/** Slack for rounding when ruling out a cell by its distance. */
const CELL_EPSILON = 1e-12;

export interface SchoolEnvironment {
  /** 0..1 — fish slow down and settle low at night. */
  activity: number;
  food: FoodPool;
  obstacles: readonly Obstacle[];
  /** 0..1 — someone is close to the front glass (the Up close view); curious fish come over. */
  viewer: number;
}

export interface SchoolOptions {
  /** Fish count from which neighbours are found through the grid (default 200). */
  gridFrom?: number;
}

/** 0..1 — how visibly hungry a fish is: it begs at the glass, droops and looks duller. */
export const hungerSlump = (hunger: number) => clamp((hunger - 0.6) / 0.4, 0, 1);

/** 0..1 — how settled in for the night the school is, from the tank's activity level. */
export const restWeight = (activity: number) => clamp((0.6 - activity) / 0.3, 0, 1);

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
  /** Seconds of startle left; fish dart along `flee` while it runs down. */
  readonly startled: Float32Array;
  private readonly flee: Float32Array;
  /** Index into `REST_SPOTS` where a fish that does not host the anemone sleeps. */
  private readonly restSpot: Uint8Array;
  private readonly wanderYaw: Float32Array;
  private readonly wanderPitch: Float32Array;
  readonly speciesList: readonly Species[];
  private readonly random: Random;
  /** Whether `step` finds neighbours through the grid rather than checking every pair. */
  readonly usesGrid: boolean;
  /** Fish-to-fish distance checks in the last `step` (for tests and profiling). */
  pairChecks = 0;
  /** Grid over every fish, for finding close fish; null when `usesGrid` is off. */
  private readonly grid: NeighbourGrid | null;
  /** Per species, a grid over its own fish for finding mates, or null to check each mate. */
  private readonly mateGrids: (NeighbourGrid | null)[];
  private readonly longest: number;
  // The fish being stepped: its closest fish and nearest mates so far, nearest first.
  private readonly closeD2 = new Float64Array(CLOSEST_SEEN);
  private readonly closeIds = new Int32Array(CLOSEST_SEEN);
  private closeCount = 0;
  private readonly mateD2 = new Float64Array(MATES_SEEN);
  private readonly mateIds = new Int32Array(MATES_SEEN);
  private mateCount = 0;
  /** Fish are numbered species by species: species s owns indices speciesStart[s] up to s + 1. */
  private readonly speciesStart: Int32Array;

  constructor(speciesList: readonly Species[], random: Random, options: SchoolOptions = {}) {
    this.speciesList = speciesList;
    this.random = random;
    this.count = speciesList.reduce((sum, s) => sum + s.count, 0);
    const n = this.count;
    this.longest = speciesList.reduce((max, s) => Math.max(max, s.length), 0);
    this.usesGrid = n >= (options.gridFrom ?? GRID_FROM);
    this.speciesStart = new Int32Array(speciesList.length + 1);
    speciesList.forEach((s, k) => (this.speciesStart[k + 1] = this.speciesStart[k]! + s.count));
    this.grid = this.usesGrid ? new NeighbourGrid(0, n) : null;
    this.mateGrids = speciesList.map((s, k) =>
      this.usesGrid && s.count > MATES_BY_LIST
        ? new NeighbourGrid(this.speciesStart[k]!, this.speciesStart[k + 1]!)
        : null
    );
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
    this.startled = new Float32Array(n);
    this.flee = new Float32Array(n * 3);
    this.restSpot = new Uint8Array(n);
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
        this.restSpot[i] = i % REST_SPOTS.length;
      }
    });
  }

  /** The glass was tapped at (x, y, z): nearby fish dart away, distant ones barely flinch. */
  startle(x: number, y: number, z: number) {
    const { pos } = this;
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      const dx = pos[o]! - x;
      const dy = (pos[o + 1]! - y) * 0.5;
      const dz = pos[o + 2]! - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-5;
      const strength = 1 - d / STARTLE_REACH;
      if (strength <= 0) continue;
      this.startled[i] = Math.max(this.startled[i]!, STARTLE_TIME * (0.4 + 0.6 * strength));
      this.flee[o] = dx / d;
      this.flee[o + 1] = dy / d;
      this.flee[o + 2] = dz / d;
    }
  }

  step(dt: number, env: SchoolEnvironment) {
    const { pos, vel } = this;
    const activity = env.activity;
    const food = env.food;
    const rest = restWeight(activity);
    const grid = this.grid;
    if (grid) {
      grid.build(pos);
      for (let k = 0; k < this.mateGrids.length; k++) this.mateGrids[k]?.build(pos);
    }
    this.pairChecks = 0;
    // The furthest any fish has moved since the grid was built: cells are searched that much wider.
    let slack = 0;

    for (let i = 0; i < this.count; i++) {
      const sp = this.speciesList[this.species[i]!]!;
      const o = i * 3;
      const px = pos[o]!;
      const py = pos[o + 1]!;
      const pz = pos[o + 2]!;
      const vx = vel[o]!;
      const vy = vel[o + 1]!;
      const vz = vel[o + 2]!;
      const cruise = sp.cruiseSpeed * (0.35 + 0.65 * activity) * (1 - 0.4 * rest);
      const startled = this.startled[i]! / STARTLE_TIME;
      const slump = hungerSlump(this.hunger[i]!);
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

      // Separation from the closest fish; alignment and cohesion with the nearest mates. Capping
      // both keeps the work per fish flat as the tank fills.
      const personal = sp.length * 1.3;
      const closeReach = (personal + this.longest * 1.3) * 0.5;
      const neighbourhood = sp.length * NEIGHBOURHOOD_LENGTHS;
      const close2 = closeReach * closeReach;
      const near2 = neighbourhood * neighbourhood;
      if (grid) {
        const { closeD2, closeIds, mateD2, mateIds } = this;
        this.closeCount = this.nearest(grid, i, px, py, pz, close2, slack, closeD2, closeIds);
        const mateGrid = this.mateGrids[this.species[i]!];
        if (mateGrid) {
          this.mateCount = this.nearest(mateGrid, i, px, py, pz, near2, slack, mateD2, mateIds);
        } else {
          this.nearestMate(i, px, py, pz, near2);
        }
      } else {
        this.searchAll(i, px, py, pz, close2, near2);
      }
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let k = 0; k < this.closeCount; k++) {
        const j = this.closeIds[k]!;
        const q = j * 3;
        const dx = pos[q]! - px;
        const dy = pos[q + 1]! - py;
        const dz = pos[q + 2]! - pz;
        const d2 = this.closeD2[k]!;
        const otherLength = this.speciesList[this.species[j]!]!.length;
        const space = (personal + otherLength * 1.3) * 0.5;
        if (d2 < space * space) {
          const inv = (space - Math.sqrt(d2)) / (space * Math.sqrt(d2));
          sx -= dx * inv;
          sy -= dy * inv;
          sz -= dz * inv;
        }
      }
      let alx = 0;
      let aly = 0;
      let alz = 0;
      let cx = 0;
      let cy = 0;
      let cz = 0;
      const mates = this.mateCount;
      for (let k = 0; k < mates; k++) {
        const q = this.mateIds[k]! * 3;
        alx += vel[q]!;
        aly += vel[q + 1]!;
        alz += vel[q + 2]!;
        cx += pos[q]! - px;
        cy += pos[q + 1]! - py;
        cz += pos[q + 2]! - pz;
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
      ay += (lerp(SWIM_BOUNDS.minY, SWIM_BOUNDS.maxY, heightPref) - py) * 0.12 * (1 - rest);

      // Home: clownfish stay within a short swim of their anemone and sleep in it; the others
      // settle in among the plants for the night.
      if (sp.hostsAnemone) {
        const dx = ANEMONE.x - px;
        const dy = ANEMONE.y + ANEMONE.height - py;
        const dz = ANEMONE.z - pz;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-5;
        const range = lerp(HOST_RANGE, ANEMONE.radius, rest);
        if (d > range) {
          const pull = Math.min(d - range, 0.3) * (0.5 + 1.5 * rest);
          ax += (dx / d) * pull;
          ay += (dy / d) * pull;
          az += (dz / d) * pull;
        }
      } else if (rest > 0) {
        const spot = REST_SPOTS[this.restSpot[i]!]!;
        ax += (spot.x - px) * 0.6 * rest;
        ay += (spot.y - py) * 0.6 * rest;
        az += (spot.z - pz) * 0.6 * rest;
      }

      // The front glass: curious fish come to see a close viewer, and hungry ones beg there.
      // Begging is a gentle pull, so an unfed tank still swims about rather than lining the glass.
      const gather = Math.max(env.viewer, slump * 0.6) * sp.curiosity * (1 - rest) * (1 - startled);
      if (gather > 0) {
        az += (SWIM_BOUNDS.maxZ - 0.03 - pz) * 0.5 * gather;
        ay += (lerp(SWIM_BOUNDS.minY, SWIM_BOUNDS.maxY, 0.7) - py) * 0.15 * slump;
      }

      // Food: hungry fish dart to the nearest flake, and the hungrier they are the further they see.
      if (food.activeCount > 0 && this.hunger[i]! > 0.25 && startled === 0) {
        let best = -1;
        const sight = 0.3 + 0.5 * this.hunger[i]!;
        let bestD2 = sight * sight;
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
      // Appetite builds over a few minutes while awake; sleeping fish do not get hungrier.
      this.hunger[i] = Math.min(1, this.hunger[i]! + (dt / 240) * (1 - rest));

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

      // Startle: a burst away from the tap that fades out over a second or so.
      if (startled > 0) {
        const dash = sp.maxSpeed * 1.5;
        ax += (this.flee[o]! * dash - vx) * 5 * startled;
        ay += (this.flee[o + 1]! * dash - vy) * 5 * startled;
        az += (this.flee[o + 2]! * dash - vz) * 5 * startled;
        this.startled[i] = Math.max(0, this.startled[i]! - dt);
      }

      const maxAccel = sp.maxSpeed * (2 + 6 * startled);
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
      const targetSpeed = clamp(speed, minSpeed, sp.maxSpeed * (1 + 0.6 * startled));
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
      if (grid) {
        // Fish further on in this loop find this fish where it is now, still in its old cell.
        const mx = pos[o]! - px;
        const my = pos[o + 1]! - py;
        const mz = pos[o + 2]! - pz;
        slack = Math.max(slack, Math.sqrt(mx * mx + my * my + mz * mz));
        grid.moved(i, pos);
        this.mateGrids[this.species[i]!]?.moved(i, pos);
      }

      // Smoothed orientation; roll into turns like a banking fish.
      const targetYaw = Math.atan2(nvx, nvz);
      const yawDelta = wrapAngle(targetYaw - this.yaw[i]!);
      const yawStep = yawDelta * Math.min(1, dt * 4);
      this.yaw[i] = wrapAngle(this.yaw[i]! + yawStep);
      // A hungry fish swims a little nose-down.
      const targetPitch = -Math.asin(clamp(nvy / targetSpeed, -1, 1)) + slump * 0.14;
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

  /** Fills the closest-fish and nearest-mate lists for fish `i` by checking every other fish. */
  private searchAll(i: number, px: number, py: number, pz: number, close2: number, near2: number) {
    const { pos, species, closeD2, closeIds, mateD2, mateIds } = this;
    const s = species[i]!;
    let closeCount = 0;
    let mateCount = 0;
    let closeLimit = close2;
    let mateLimit = near2;
    for (let j = 0; j < this.count; j++) {
      const q = j * 3;
      const dx = pos[q]! - px;
      const dy = pos[q + 1]! - py;
      const dz = pos[q + 2]! - pz;
      const d2 = dx * dx + dy * dy + dz * dz + 1e-6;
      if (d2 > closeLimit && d2 > mateLimit) continue;
      if (j === i) continue;
      if (d2 < close2 && d2 <= closeLimit) {
        closeCount = keepNearest(closeD2, closeIds, closeCount, d2, j);
        if (closeCount === CLOSEST_SEEN) closeLimit = closeD2[CLOSEST_SEEN - 1]!;
      }
      if (d2 < near2 && d2 <= mateLimit && species[j] === s) {
        mateCount = keepNearest(mateD2, mateIds, mateCount, d2, j);
        if (mateCount === MATES_SEEN) mateLimit = mateD2[MATES_SEEN - 1]!;
      }
    }
    this.closeCount = closeCount;
    this.mateCount = mateCount;
    this.pairChecks += this.count - 1;
  }

  /**
   * Fills `ids`/`d2s` (capacity = buffer length) with the fish in `grid` nearest to fish `i`, closer
   * than `reach2` (squared, plus 1e-6), nearest first. Cells are visited nearest first until no
   * fish further out could make the list. Cell boxes are grown by `slack`, since fish already
   * stepped this step have moved since the build. Returns the list length.
   */
  private nearest(
    grid: NeighbourGrid,
    i: number,
    px: number,
    py: number,
    pz: number,
    reach2: number,
    slack: number,
    d2s: Float64Array,
    ids: Int32Array
  ) {
    const { nx, ny, nz, sizeX, sizeY, sizeZ, start, sorted, at, offsetX, offsetY, offsetZ } = grid;
    const cap = ids.length;
    let size = 0;
    let limit = reach2;
    const ci = grid.cellX(px);
    const cj = grid.cellY(py);
    const ck = grid.cellZ(pz);
    for (let o = 0; o < offsetX.length; o++) {
      // Offsets come in order of how many whole cells lie between, so once a cell that far away
      // is out of reach, every later one is too.
      const gap = Math.max(0, grid.offsetGap[o]! * grid.smallest - slack);
      if (gap * gap + 1e-6 - CELL_EPSILON > limit) break;
      const cx = ci + offsetX[o]!;
      const cy = cj + offsetY[o]!;
      const cz = ck + offsetZ[o]!;
      if (cx < 0 || cx >= nx || cy < 0 || cy >= ny || cz < 0 || cz >= nz) continue;
      const c = (cx * ny + cy) * nz + cz;
      const from = start[c]!;
      const to = start[c + 1]!;
      if (from === to) continue;
      const lx = grid.minX + cx * sizeX - slack;
      const ly = grid.minY + cy * sizeY - slack;
      const lz = grid.minZ + cz * sizeZ - slack;
      const hx = lx + sizeX + 2 * slack;
      const hy = ly + sizeY + 2 * slack;
      const hz = lz + sizeZ + 2 * slack;
      const gx = px < lx ? lx - px : px > hx ? px - hx : 0;
      const gy = py < ly ? ly - py : py > hy ? py - hy : 0;
      const gz = pz < lz ? lz - pz : pz > hz ? pz - hz : 0;
      if (gx * gx + gy * gy + gz * gz + 1e-6 - CELL_EPSILON > limit) continue;
      for (let k = from; k < to; k++) {
        const q = k * 3;
        const dx = at[q]! - px;
        const dy = at[q + 1]! - py;
        const dz = at[q + 2]! - pz;
        const d2 = dx * dx + dy * dy + dz * dz + 1e-6;
        if (d2 <= limit && d2 < reach2) {
          const j = sorted[k]!;
          if (j === i) continue;
          size = keepNearest(d2s, ids, size, d2, j);
          if (size === cap) limit = d2s[cap - 1]!;
        }
      }
      this.pairChecks += to - from;
    }
    return size;
  }

  /** Fills the nearest-mate list for fish `i` by checking each fish of its species. */
  private nearestMate(i: number, px: number, py: number, pz: number, near2: number) {
    const pos = this.pos;
    const s = this.species[i]!;
    const first = this.speciesStart[s]!;
    const last = this.speciesStart[s + 1]!;
    let size = 0;
    let limit = near2;
    for (let j = first; j < last; j++) {
      if (j === i) continue;
      const q = j * 3;
      const dx = pos[q]! - px;
      const dy = pos[q + 1]! - py;
      const dz = pos[q + 2]! - pz;
      const d2 = dx * dx + dy * dy + dz * dz + 1e-6;
      if (d2 <= limit && d2 < near2) {
        size = keepNearest(this.mateD2, this.mateIds, size, d2, j);
        if (size === MATES_SEEN) limit = this.mateD2[MATES_SEEN - 1]!;
      }
    }
    this.mateCount = size;
    this.pairChecks += last - first - 1;
  }
}

/**
 * Inserts fish `j` at squared distance `d2` into a list kept nearest first, capped at the buffer
 * length. Ties go to the lower index, so the list does not depend on the order fish are found in.
 * Returns the new list length.
 */
const keepNearest = (d2s: Float64Array, ids: Int32Array, size: number, d2: number, j: number) => {
  const cap = ids.length;
  let k = size < cap ? size : cap - 1;
  if (size === cap && !nearer(d2, j, d2s[k]!, ids[k]!)) return size;
  while (k > 0 && nearer(d2, j, d2s[k - 1]!, ids[k - 1]!)) {
    d2s[k] = d2s[k - 1]!;
    ids[k] = ids[k - 1]!;
    k--;
  }
  d2s[k] = d2;
  ids[k] = j;
  return size < cap ? size + 1 : size;
};

const nearer = (d2: number, j: number, otherD2: number, other: number) =>
  d2 < otherD2 || (d2 === otherD2 && j < other);

/**
 * Uniform grid over the fish numbered `first` up to `last`, rebuilt every step by counting sort,
 * so each cell's fish sit together in `sorted` in index order. Cells are sized for about
 * `GRID_FISH_PER_CELL` fish each on average, and buffers are sized once.
 */
class NeighbourGrid {
  readonly first: number;
  readonly last: number;
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  minX = 0;
  minY = 0;
  minZ = 0;
  sizeX = 0;
  sizeY = 0;
  sizeZ = 0;
  /** The shortest cell edge. */
  smallest = 0;
  /** Where each cell's fish start in `sorted`; one extra entry closes the last cell. */
  readonly start: Int32Array;
  readonly sorted: Int32Array;
  /** Positions of the fish in `sorted` order, kept current as fish move during a step. */
  readonly at: Float32Array;
  /** Where each fish sits in `sorted`, counting from `first`. */
  private readonly slot: Int32Array;
  /** Cell offsets to search, nearest first, and how many whole cells lie between for each. */
  readonly offsetX: Int16Array;
  readonly offsetY: Int16Array;
  readonly offsetZ: Int16Array;
  readonly offsetGap: Float64Array;
  private readonly fill: Int32Array;
  private readonly cellOf: Int32Array;

  constructor(first: number, last: number) {
    this.first = first;
    this.last = last;
    const width = SWIM_BOUNDS.maxX - SWIM_BOUNDS.minX;
    const height = SWIM_BOUNDS.maxY - SWIM_BOUNDS.minY;
    const depth = SWIM_BOUNDS.maxZ - SWIM_BOUNDS.minZ;
    const cell = clamp(
      Math.cbrt((width * height * depth * GRID_FISH_PER_CELL) / Math.max(1, last - first)),
      GRID_CELL_MIN,
      GRID_CELL_MAX
    );
    this.nx = Math.max(1, Math.round(width / cell));
    this.ny = Math.max(1, Math.round(height / cell));
    this.nz = Math.max(1, Math.round(depth / cell));
    const cells = this.nx * this.ny * this.nz;
    this.start = new Int32Array(cells + 1);
    this.fill = new Int32Array(cells);
    this.sorted = new Int32Array(last - first);
    this.cellOf = new Int32Array(last - first);
    this.at = new Float32Array((last - first) * 3);
    this.slot = new Int32Array(last - first);

    const offsets: { x: number; y: number; z: number; gap: number; centre: number }[] = [];
    const between = (d: number) => Math.max(0, Math.abs(d) - 1);
    for (let x = 1 - this.nx; x < this.nx; x++) {
      for (let y = 1 - this.ny; y < this.ny; y++) {
        for (let z = 1 - this.nz; z < this.nz; z++) {
          offsets.push({
            x,
            y,
            z,
            gap: Math.hypot(between(x), between(y), between(z)),
            centre: Math.hypot(x, y, z),
          });
        }
      }
    }
    // Among cells equally far away, those nearer the middle first fill the lists sooner.
    offsets.sort((a, b) => a.gap - b.gap || a.centre - b.centre);
    this.offsetX = Int16Array.from(offsets, (o) => o.x);
    this.offsetY = Int16Array.from(offsets, (o) => o.y);
    this.offsetZ = Int16Array.from(offsets, (o) => o.z);
    this.offsetGap = Float64Array.from(offsets, (o) => o.gap);
  }

  cellX(x: number) {
    return cellIndex(x, this.minX, this.sizeX, this.nx);
  }

  cellY(y: number) {
    return cellIndex(y, this.minY, this.sizeY, this.ny);
  }

  cellZ(z: number) {
    return cellIndex(z, this.minZ, this.sizeZ, this.nz);
  }

  build(pos: Float32Array) {
    const { first, last } = this;
    // The swim volume, widened to take in any fish outside it, so every fish lies inside its cell.
    let minX: number = SWIM_BOUNDS.minX;
    let maxX: number = SWIM_BOUNDS.maxX;
    let minY: number = SWIM_BOUNDS.minY;
    let maxY: number = SWIM_BOUNDS.maxY;
    let minZ: number = SWIM_BOUNDS.minZ;
    let maxZ: number = SWIM_BOUNDS.maxZ;
    for (let i = first; i < last; i++) {
      const o = i * 3;
      minX = Math.min(minX, pos[o]!);
      maxX = Math.max(maxX, pos[o]!);
      minY = Math.min(minY, pos[o + 1]!);
      maxY = Math.max(maxY, pos[o + 1]!);
      minZ = Math.min(minZ, pos[o + 2]!);
      maxZ = Math.max(maxZ, pos[o + 2]!);
    }
    this.minX = minX;
    this.minY = minY;
    this.minZ = minZ;
    this.sizeX = (maxX - minX) / this.nx;
    this.sizeY = (maxY - minY) / this.ny;
    this.sizeZ = (maxZ - minZ) / this.nz;
    this.smallest = Math.min(this.sizeX, this.sizeY, this.sizeZ);

    const { start, fill, cellOf, sorted } = this;
    fill.fill(0);
    for (let i = first; i < last; i++) {
      const o = i * 3;
      const c =
        (this.cellX(pos[o]!) * this.ny + this.cellY(pos[o + 1]!)) * this.nz +
        this.cellZ(pos[o + 2]!);
      cellOf[i - first] = c;
      fill[c] = fill[c]! + 1;
    }
    let next = 0;
    for (let c = 0; c < fill.length; c++) {
      start[c] = next;
      next += fill[c]!;
      fill[c] = 0;
    }
    start[fill.length] = next;
    const { at, slot } = this;
    for (let i = first; i < last; i++) {
      const c = cellOf[i - first]!;
      const k = start[c]! + fill[c]!;
      sorted[k] = i;
      slot[i - first] = k;
      at[k * 3] = pos[i * 3]!;
      at[k * 3 + 1] = pos[i * 3 + 1]!;
      at[k * 3 + 2] = pos[i * 3 + 2]!;
      fill[c] = fill[c]! + 1;
    }
  }

  /** Fish `i` moved to `pos`; it stays in its cell for the rest of the step. */
  moved(i: number, pos: Float32Array) {
    if (i < this.first || i >= this.last) return;
    const q = this.slot[i - this.first]! * 3;
    this.at[q] = pos[i * 3]!;
    this.at[q + 1] = pos[i * 3 + 1]!;
    this.at[q + 2] = pos[i * 3 + 2]!;
  }
}

const cellIndex = (v: number, min: number, size: number, cells: number) => {
  const c = Math.floor((v - min) / size);
  return c < 0 ? 0 : c >= cells ? cells - 1 : c;
};

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
