import type { Viewpoint } from '../state/store';

/** The order ambient mode moves through the shots: wide, closer, close, a fish, and back out. */
export const AMBIENT_SEQUENCE: readonly Viewpoint[] = ['sofa', 'tank', 'glass', 'follow', 'room'];

/** Seconds each shot is held before the next one. */
export const AMBIENT_DWELL: Record<Viewpoint, number> = {
  sofa: 40,
  tank: 32,
  glass: 24,
  follow: 28,
  room: 36,
};

/** Turning ambient mode on moves to the next shot this soon, so the toggle visibly does something. */
export const AMBIENT_FIRST_CUT = 4;

/** After the visitor orbits, zooms or picks a shot, the cycle waits this long before moving on. */
export const AMBIENT_RESUME_AFTER = 45;

/** Longest frame step counted, so a tab that was hidden for minutes moves on by one shot at most. */
const MAX_STEP = 0.25;

export type AmbientCycle = {
  /** Seconds until the next shot. */
  remaining: number;
  /** Seconds since the current shot started drifting. */
  driftTime: number;
};

export const createAmbientCycle = (): AmbientCycle => ({
  remaining: AMBIENT_FIRST_CUT,
  driftTime: 0,
});

/** The shot after `current`; a viewpoint outside the sequence starts it from the top. */
export const nextAmbientShot = (current: Viewpoint): Viewpoint => {
  const index = AMBIENT_SEQUENCE.indexOf(current);
  return AMBIENT_SEQUENCE[(index + 1) % AMBIENT_SEQUENCE.length]!;
};

/** Ambient mode was just turned on. */
export const startAmbient = (cycle: AmbientCycle) => {
  cycle.remaining = AMBIENT_FIRST_CUT;
  cycle.driftTime = 0;
};

/** The visitor took the camera: hold this shot, and stop drifting, until they have been idle a while. */
export const interruptAmbient = (cycle: AmbientCycle) => {
  cycle.remaining = Math.max(cycle.remaining, AMBIENT_RESUME_AFTER);
  cycle.driftTime = -1;
};

/** True while the cycle is waiting out a visitor's interaction. */
export const ambientHeld = (cycle: AmbientCycle) => cycle.driftTime < 0;

/**
 * Advances the cycle by `delta` seconds. Returns the shot to move to when it is time, else null.
 * Allocation free: it runs every frame.
 */
export const stepAmbient = (
  cycle: AmbientCycle,
  delta: number,
  current: Viewpoint
): Viewpoint | null => {
  const step = Math.min(Math.max(delta, 0), MAX_STEP);
  cycle.remaining -= step;
  if (cycle.driftTime >= 0) cycle.driftTime += step;
  if (cycle.remaining > 0) return null;
  const next = nextAmbientShot(current);
  cycle.remaining = AMBIENT_DWELL[next];
  cycle.driftTime = 0;
  return next;
};

/** Gentle drift around a shot: peak sway either side (radians) and the period of each sway (seconds). */
export const DRIFT = {
  azimuth: 0.07,
  azimuthPeriod: 46,
  polar: 0.025,
  polarPeriod: 31,
};

export type DriftDelta = { azimuth: number; polar: number };

/**
 * How far to rotate this frame so the camera's offset from the shot follows `amplitude · sin(ωt)`:
 * it starts on the shot, sways slowly to either side and never wanders off. Writes into `out`.
 */
export const driftDelta = (time: number, delta: number, out: DriftDelta): DriftDelta => {
  const wa = (2 * Math.PI) / DRIFT.azimuthPeriod;
  const wp = (2 * Math.PI) / DRIFT.polarPeriod;
  out.azimuth = DRIFT.azimuth * (Math.sin(wa * (time + delta)) - Math.sin(wa * time));
  out.polar = DRIFT.polar * (Math.sin(wp * (time + delta)) - Math.sin(wp * time));
  return out;
};
