import { describe, expect, it } from 'vitest';
import { TANK, substrateHeight } from '../src/config/scene';
import { DRIFTWOOD_PATHS, OBSTACLES, PLANTS, ROCKS, scatter } from '../src/sim/aquascape';
import { formatHour } from '../src/state/store';

describe('aquascape layout', () => {
  it('rests every rock on the sand inside the glass', () => {
    for (const rock of ROCKS) {
      expect(Math.abs(rock.x) + rock.radius).toBeLessThan(TANK.width / 2);
      expect(Math.abs(rock.z) + rock.radius * 0.8).toBeLessThan(TANK.depth / 2);
      expect(rock.y).toBeGreaterThan(substrateHeight(rock.x, rock.z));
    }
  });

  it('slopes the substrate up towards the back glass', () => {
    expect(substrateHeight(0, -TANK.depth / 2)).toBeGreaterThan(substrateHeight(0, TANK.depth / 2));
  });

  it('keeps obstacles under water', () => {
    for (const ob of OBSTACLES) expect(ob.y).toBeLessThan(TANK.waterLevel);
  });

  it('gives every visible driftwood path segment a matching capsule obstacle', () => {
    const capsules = OBSTACLES.filter((obstacle) => obstacle.kind === 'capsule');
    expect(capsules).toHaveLength(
      DRIFTWOOD_PATHS.reduce((total, path) => total + path.points.length - 1, 0)
    );
    for (const path of DRIFTWOOD_PATHS) {
      for (let i = 0; i < path.points.length - 1; i++) {
        const start = path.points[i]!;
        const end = path.points[i + 1]!;
        expect(
          capsules.some(
            (capsule) =>
              capsule.ax === start[0] &&
              capsule.ay === start[1] &&
              capsule.az === start[2] &&
              capsule.bx === end[0] &&
              capsule.by === end[1] &&
              capsule.bz === end[2]
          )
        ).toBe(true);
      }
    }
  });

  it('scatters plants deterministically inside the tank', () => {
    for (const clump of PLANTS) {
      const a = scatter(clump, 1);
      expect(a).toEqual(scatter(clump, 1));
      for (const p of a) {
        expect(Math.abs(p.x)).toBeLessThan(TANK.width / 2);
        expect(Math.abs(p.z)).toBeLessThan(TANK.depth / 2);
      }
    }
  });
});

describe('formatHour', () => {
  it('formats fractional hours as a clock', () => {
    expect(formatHour(9.5)).toBe('09:30');
    expect(formatHour(23.99)).toBe('23:59');
  });
});
