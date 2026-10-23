import { BASE_FOV, MARGIN, MAX_FOV, frameShot } from '../src/scene/framing';
import type { Box, Vec3 } from '../src/scene/framing';
import { REACH, SHOTS, frameFor, shotSubject } from '../src/scene/shots';

const DEG = Math.PI / 180;

const corners = (box: Box): Vec3[] =>
  Array.from({ length: 8 }, (_, i) => [
    i & 1 ? box.max[0] : box.min[0],
    i & 2 ? box.max[1] : box.min[1],
    i & 4 ? box.max[2] : box.min[2],
  ]);

/** Normalised screen coordinates (-1..1 is on screen) of `point` seen from a look-at camera. */
const project = (point: Vec3, eye: Vec3, target: Vec3, fov: number, aspect: number) => {
  const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const unit = (a: Vec3): Vec3 => {
    const l = Math.hypot(...a);
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  const forward = unit(sub(target, eye));
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const v = sub(point, eye);
  const depth = dot(v, forward);
  const tanY = Math.tan((fov * DEG) / 2);
  return { x: dot(v, right) / (depth * tanY * aspect), y: dot(v, up) / (depth * tanY) };
};

const ROOMY: Box = { min: [-50, -50, -50], max: [50, 50, 50] };
const SUBJECT: Box = { min: [-0.7, 0, -0.25], max: [0.7, 1.3, 0.25] };
const PORTRAITS = [375 / 812, 390 / 844];
const LANDSCAPES = [16 / 9, 1.8, 2, 21 / 9];

describe('frameShot', () => {
  it('leaves a shot alone when the subject already fits', () => {
    const framing = frameShot([0, 1, 5], [0, 0.8, 0], SUBJECT, 16 / 9, ROOMY);
    expect(framing).toEqual({ position: [0, 1, 5], fov: BASE_FOV });
  });

  it('dollies back along the line of sight until a portrait screen fits the subject', () => {
    const eye: Vec3 = [0.3, 1, 2];
    const target: Vec3 = [0, 0.8, 0];
    const aspect = 375 / 812;
    const { position, fov } = frameShot(eye, target, SUBJECT, aspect, ROOMY);

    expect(fov).toBe(BASE_FOV);
    const before = Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]);
    const after = Math.hypot(...position.map((v, i) => v - target[i]!));
    expect(after).toBeGreaterThan(before);
    for (let i = 0; i < 3; i++) {
      expect((position[i]! - target[i]!) / after).toBeCloseTo((eye[i]! - target[i]!) / before, 9);
    }

    const xs = corners(SUBJECT).map((c) => Math.abs(project(c, position, target, fov, aspect).x));
    // Tight: the widest corner sits exactly on the margin.
    expect(Math.max(...xs)).toBeCloseTo(1 - MARGIN, 6);
  });

  it('widens the field of view once a wall stops the dolly', () => {
    const eye: Vec3 = [0, 1, 2];
    const target: Vec3 = [0, 0.8, 0];
    const aspect = 0.6;
    const reach: Box = { min: [-3, 0, -3], max: [3, 3, 2.2] };
    const { position, fov } = frameShot(eye, target, SUBJECT, aspect, reach);

    expect(position[2]).toBeCloseTo(2.2, 6);
    expect(fov).toBeGreaterThan(BASE_FOV);
    expect(fov).toBeLessThan(MAX_FOV);
    const xs = corners(SUBJECT).map((c) => Math.abs(project(c, position, target, fov, aspect).x));
    expect(Math.max(...xs)).toBeCloseTo(1 - MARGIN, 6);
  });

  it('caps the field of view on extremely narrow screens', () => {
    const reach: Box = { min: [-3, 0, -3], max: [3, 3, 2] };
    const { fov } = frameShot([0, 1, 2], [0, 0.8, 0], SUBJECT, 0.1, reach);
    expect(fov).toBe(MAX_FOV);
  });
});

describe('aquarium shots', () => {
  it.each(LANDSCAPES)('are unchanged on a %f landscape screen', (aspect) => {
    for (const shot of Object.values(SHOTS)) {
      expect(frameFor(shot, aspect)).toEqual({ position: shot.position, fov: BASE_FOV });
    }
  });

  it.each(PORTRAITS)('fit the whole tank and cabinet on a %f portrait screen', (aspect) => {
    for (const name of ['sofa', 'tank', 'room'] as const) {
      const shot = SHOTS[name];
      const { position, fov } = frameFor(shot, aspect);
      for (let i = 0; i < 3; i++) {
        expect(position[i]).toBeGreaterThanOrEqual(REACH.min[i]! - 1e-9);
        expect(position[i]).toBeLessThanOrEqual(REACH.max[i]! + 1e-9);
      }
      for (const corner of corners(shotSubject(shot.fit!))) {
        const { x, y } = project(corner, position, shot.target, fov, aspect);
        expect(Math.abs(x)).toBeLessThanOrEqual(1 - (shot.margin ?? MARGIN) + 1e-6);
        expect(Math.abs(y)).toBeLessThan(1);
      }
    }
  });

  it('keep some room either side of the cabinet in the Sofa view', () => {
    expect(SHOTS.sofa.fit).toBeGreaterThan(0);
  });
});
