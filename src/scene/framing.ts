/**
 * Aspect-aware shot framing. Plain maths (no Three.js) so it is unit-testable.
 *
 * A shot is authored for landscape screens. On narrower screens the horizontal field of view
 * shrinks, so we first dolly the camera back along its own line of sight until the subject fits
 * across the screen, stopping at the room walls, and only then widen the vertical FOV for what is
 * left. Shots that already fit come back unchanged.
 */

export type Vec3 = readonly [number, number, number];
export type Box = { readonly min: Vec3; readonly max: Vec3 };

export type Framing = { position: [number, number, number]; fov: number };

/** Vertical field of view the shots are authored for, in degrees. */
export const BASE_FOV = 42;
/** Widest vertical FOV we accept before letting the subject crop. */
export const MAX_FOV = 75;
/** Default fraction of the half-screen width kept free on each side of the subject. */
export const MARGIN = 0.06;

const DEG = Math.PI / 180;

/** Distance from `origin` along unit `dir` to where it leaves `box` (origin inside the box). */
const exitDistance = (origin: Vec3, dir: Vec3, box: Box) => {
  let t = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const d = dir[axis]!;
    if (d > 1e-9) t = Math.min(t, (box.max[axis]! - origin[axis]!) / d);
    else if (d < -1e-9) t = Math.min(t, (box.min[axis]! - origin[axis]!) / d);
  }
  return Math.max(0, t);
};

/**
 * Frames `subject` horizontally for a camera looking from `position` at `target` on a screen of
 * `aspect` (width / height), keeping `margin` of each half-screen free. The camera may move back
 * as far as the edge of `reach`.
 */
export const frameShot = (
  position: Vec3,
  target: Vec3,
  subject: Box,
  aspect: number,
  reach: Box,
  margin = MARGIN
): Framing => {
  const bx = position[0] - target[0];
  const by = position[1] - target[1];
  const bz = position[2] - target[2];
  const d0 = Math.hypot(bx, by, bz);
  // `back` points from the target towards the camera; forward is its negation.
  const back: Vec3 = [bx / d0, by / d0, bz / d0];
  // Camera right = forward × world up, flattened to the floor plane.
  const rl = Math.hypot(back[0], back[2]);
  const rx = back[2] / rl;
  const rz = -back[0] / rl;

  // Each subject corner as (lateral offset, depth beyond the target) in camera space.
  const corners: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const cx = (i & 1 ? subject.max[0] : subject.min[0]) - target[0];
    const cy = (i & 2 ? subject.max[1] : subject.min[1]) - target[1];
    const cz = (i & 4 ? subject.max[2] : subject.min[2]) - target[2];
    corners.push([Math.abs(cx * rx + cz * rz), -(cx * back[0] + cy * back[1] + cz * back[2])]);
  }

  // Usable tangent of the horizontal half-angle at a given vertical FOV.
  const halfWidth = (fov: number) => Math.tan((fov * DEG) / 2) * aspect * (1 - margin);

  // A corner at lateral x and depth z fits when x / (d + z) <= halfWidth.
  const t0 = halfWidth(BASE_FOV);
  let needed = 0;
  for (const [x, z] of corners) needed = Math.max(needed, x / t0 - z);
  if (needed <= d0) return { position: [...position], fov: BASE_FOV };

  const distance = Math.min(needed, Math.max(d0, exitDistance(target, back, reach)));
  let tangent = 0;
  for (const [x, z] of corners) {
    const depth = distance + z;
    tangent = depth > 1e-6 ? Math.max(tangent, x / depth) : Infinity;
  }
  const fov = (2 * Math.atan(tangent / (aspect * (1 - margin)))) / DEG;

  return {
    position: [
      target[0] + back[0] * distance,
      target[1] + back[1] * distance,
      target[2] + back[2] * distance,
    ],
    fov: Math.min(MAX_FOV, Math.max(BASE_FOV, fov)),
  };
};
