import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { TANK, substrateHeight } from '../src/config/scene';
import { DRIFTWOOD, ROCKS } from '../src/sim/aquascape';
import {
  PLANT_GEOMETRY,
  buildBlade,
  buildDriftwood,
  buildRock,
  buildSubstrate,
  taperedTube,
} from '../src/scene/tank/aquascapeGeometry';

const W = TANK.width - TANK.glass * 2;
const D = TANK.depth - TANK.glass * 2;

const positions = (geo: THREE.BufferGeometry) =>
  geo.getAttribute('position') as THREE.BufferAttribute;

const bounds = (geo: THREE.BufferGeometry) => {
  geo.computeBoundingBox();
  return geo.boundingBox!;
};

/** Every attribute value is a real number and every index points at a vertex. */
const expectWellFormed = (geo: THREE.BufferGeometry) => {
  const pos = positions(geo);
  for (const value of pos.array) expect(Number.isFinite(value)).toBe(true);
  const normal = geo.getAttribute('normal');
  expect(normal.count).toBe(pos.count);
  for (const value of normal.array) expect(Number.isFinite(value)).toBe(true);
  const index = geo.getIndex()!;
  expect(index.count % 3).toBe(0);
  for (const i of index.array) expect(i).toBeLessThan(pos.count);
};

/**
 * Edges used by exactly one triangle, with vertices welded by position. A closed surface has none;
 * the substrate is open only where it sits on the glass floor.
 */
const openEdges = (geo: THREE.BufferGeometry) => {
  const pos = positions(geo);
  const key = (i: number) =>
    [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => Math.round(v * 1e5)).join(',');
  const ids = new Map<string, number>();
  const weld = (i: number) => {
    const k = key(i);
    if (!ids.has(k)) ids.set(k, ids.size);
    return ids.get(k)!;
  };
  const edges = new Map<string, { a: number; b: number; uses: number }>();
  const index = geo.getIndex()!;
  for (let t = 0; t < index.count; t += 3) {
    const tri = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    for (let e = 0; e < 3; e++) {
      const a = tri[e]!;
      const b = tri[(e + 1) % 3]!;
      const [wa, wb] = [weld(a), weld(b)].sort((x, y) => x - y);
      const k = `${wa}-${wb}`;
      const edge = edges.get(k) ?? { a, b, uses: 0 };
      edge.uses++;
      edges.set(k, edge);
    }
  }
  return [...edges.values()].filter((edge) => edge.uses === 1);
};

describe('substrate', () => {
  const geo = buildSubstrate();
  const pos = positions(geo);

  it('is well formed', () => expectWellFormed(geo));

  it('covers the inner floor from glass to glass', () => {
    const box = bounds(geo);
    expect(box.min.x).toBeCloseTo(-W / 2, 6);
    expect(box.max.x).toBeCloseTo(W / 2, 6);
    expect(box.min.z).toBeCloseTo(-D / 2, 6);
    expect(box.max.z).toBeCloseTo(D / 2, 6);
    expect(box.min.y).toBe(0);
  });

  it('follows the sloped sand height on top', () => {
    let top = 0;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) === 0) continue;
      top++;
      expect(Math.abs(pos.getY(i) - substrateHeight(pos.getX(i), pos.getZ(i)))).toBeLessThan(
        0.0016
      );
    }
    expect(top).toBeGreaterThan(91 * 37);
  });

  it('closes the volume with skirts down to the glass floor', () => {
    const open = openEdges(geo);
    expect(open.length).toBeGreaterThan(0);
    for (const { a, b } of open) {
      expect(pos.getY(a)).toBe(0);
      expect(pos.getY(b)).toBe(0);
    }
  });

  it('faces the skirts outwards, towards the glass', () => {
    const normal = geo.getAttribute('normal');
    const index = geo.getIndex()!;
    const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const n = new THREE.Vector3();
    const centre = new THREE.Vector3();
    let skirts = 0;
    for (let t = 0; t < index.count; t += 3) {
      for (let k = 0; k < 3; k++) p[k]!.fromBufferAttribute(pos, index.getX(t + k));
      if (p.every((v) => v.y !== 0)) continue; // top surface
      skirts++;
      n.subVectors(p[1]!, p[0]!).cross(centre.subVectors(p[2]!, p[0]!));
      centre.copy(p[0]!).add(p[1]!).add(p[2]!).divideScalar(3);
      centre.y = 0;
      expect(n.dot(centre)).toBeGreaterThan(0);
    }
    expect(skirts).toBe(2 * 2 * (90 + 36));
    // The top surface faces up.
    let up = 0;
    for (let i = 0; i < 91 * 37; i++) up += normal.getY(i) > 0.9 ? 1 : 0;
    expect(up).toBe(91 * 37);
  });

  it('is deterministic', () => {
    expect(Array.from(positions(buildSubstrate()).array)).toEqual(Array.from(pos.array));
  });
});

describe('rocks', () => {
  const rocks = ROCKS.map((r) => ({ r, geo: buildRock(r.seed) }));

  it('are well formed, coloured and welded', () => {
    for (const { geo } of rocks) {
      expectWellFormed(geo);
      expect(geo.getAttribute('color').count).toBe(positions(geo).count);
      expect(geo.getAttribute('uv')).toBeUndefined();
      // Welded: a closed surface with no open edges.
      expect(openEdges(geo)).toHaveLength(0);
    }
  });

  it('have a flat base and stay roughly unit sized', () => {
    for (const { geo } of rocks) {
      const box = bounds(geo);
      expect(box.min.y).toBeGreaterThan(-0.4);
      expect(box.min.y).toBeLessThan(-0.34);
      for (const axis of ['x', 'y', 'z'] as const) {
        expect(box.max[axis]).toBeLessThan(1.25);
        expect(box.max[axis]).toBeGreaterThan(0.5);
      }
    }
  });

  it('sit on the sand: the flat base meets the surface, well above the glass floor', () => {
    for (const { r, geo } of rocks) {
      const base = r.y + bounds(geo).min.y * r.radius * r.squash;
      // Within the sand's own grain jitter (1.5 mm) of the surface: neither floating nor sunk.
      expect(Math.abs(base - substrateHeight(r.x, r.z))).toBeLessThan(0.0015);
      expect(base).toBeGreaterThan(0.02);
    }
  });

  it('differ per seed and repeat for the same seed', () => {
    const a = Array.from(positions(buildRock(1)).array);
    expect(Array.from(positions(buildRock(1)).array)).toEqual(a);
    expect(Array.from(positions(buildRock(2)).array)).not.toEqual(a);
  });
});

describe('driftwood', () => {
  const pieces = buildDriftwood();

  it('builds a trunk and two branches inside the water', () => {
    expect(pieces).toHaveLength(3);
    for (const geo of pieces) {
      expectWellFormed(geo);
      const box = bounds(geo);
      expect(box.min.x).toBeGreaterThan(-W / 2);
      expect(box.max.x).toBeLessThan(W / 2);
      expect(box.min.z).toBeGreaterThan(-D / 2);
      expect(box.max.z).toBeLessThan(D / 2);
      expect(box.min.y).toBeGreaterThan(0);
      expect(box.max.y).toBeLessThan(TANK.waterLevel);
    }
  });

  it('starts the trunk at the sand', () => {
    const [x, y, z] = DRIFTWOOD[0]!;
    expect(y).toBeGreaterThan(substrateHeight(x, z));
    expect(y - 0.03).toBeLessThan(substrateHeight(x, z));
  });
});

describe('tapered tube', () => {
  const curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
  const geo = taperedTube(curve, 20, 8, 0.1, 0.02);
  const pos = positions(geo);

  /** Mean distance from the axis of one ring of vertices. */
  const ringRadius = (ring: number) => {
    let sum = 0;
    for (let j = 0; j <= 8; j++) {
      const i = ring * 9 + j;
      sum += Math.hypot(pos.getX(i), pos.getZ(i));
    }
    return sum / 9;
  };

  it('lays out (segments + 1) rings of (radial + 1) vertices', () => {
    expect(pos.count).toBe(21 * 9);
    expect(geo.getIndex()!.count).toBe(20 * 8 * 6);
    expectWellFormed(geo);
  });

  it('tapers from r0 at the base to r1 at the tip', () => {
    expect(ringRadius(0)).toBeCloseTo(0.1, 6);
    expect(ringRadius(20)).toBeLessThan(0.03);
    expect(ringRadius(20)).toBeGreaterThan(0.015);
    expect(ringRadius(10)).toBeLessThan(ringRadius(0));
    expect(ringRadius(10)).toBeGreaterThan(ringRadius(20));
  });

  it('closes each ring and wraps v along the length', () => {
    const uv = geo.getAttribute('uv');
    for (let ring = 0; ring <= 20; ring++) {
      const first = ring * 9;
      const last = first + 8;
      expect(pos.getX(last)).toBeCloseTo(pos.getX(first), 6);
      expect(pos.getZ(last)).toBeCloseTo(pos.getZ(first), 6);
      expect(uv.getY(first)).toBeCloseTo((ring / 20) * 3, 6);
    }
  });
});

describe('plant blades', () => {
  it.each(Object.keys(PLANT_GEOMETRY) as (keyof typeof PLANT_GEOMETRY)[])(
    'the %s blade rises from y = 0 and stays within 0..1',
    (kind) => {
      const geo = PLANT_GEOMETRY[kind]();
      expectWellFormed(geo);
      const box = bounds(geo);
      expect(box.min.y).toBe(0);
      expect(box.max.y).toBeLessThanOrEqual(1);
      expect(box.max.y).toBeGreaterThan(0.7);
      expect(box.min.z).toBe(0); // arches forwards from its base
      expect(geo.getAttribute('color').count).toBe(positions(geo).count);
    }
  );

  it('spans exactly 0..1 when it does not arch', () => {
    const geo = buildBlade(4, 0.1, () => 1, 0, '#000000', '#ffffff');
    const pos = positions(geo);
    expect(pos.count).toBe(10);
    expect(geo.getIndex()!.count).toBe(4 * 6);
    for (let i = 0; i < pos.count; i++) {
      expect(pos.getY(i)).toBeCloseTo(Math.floor(i / 2) / 4, 6);
      expect(pos.getZ(i)).toBe(0);
      expect(Math.abs(pos.getX(i))).toBeCloseTo(0.05, 6);
    }
  });

  it('shapes the width with the profile and ramps colour from base to tip', () => {
    const geo = buildBlade(2, 1, (t) => 1 - t, 0, '#000000', '#ffffff');
    const pos = positions(geo);
    expect(pos.getX(1) - pos.getX(0)).toBeCloseTo(1, 6);
    expect(pos.getX(3) - pos.getX(2)).toBeCloseTo(0.5, 6);
    expect(pos.getX(5) - pos.getX(4)).toBeCloseTo(0, 6);
    const color = geo.getAttribute('color');
    expect(color.getX(0)).toBeCloseTo(0, 6);
    expect(color.getX(4)).toBeCloseTo(1, 6);
    // The back edge is a touch darker, so the blade reads as folded.
    expect(color.getX(5)).toBeCloseTo(0.9, 6);
  });
});
