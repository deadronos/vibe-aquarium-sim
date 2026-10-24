import {
  AMBIENT_DWELL,
  AMBIENT_FIRST_CUT,
  AMBIENT_RESUME_AFTER,
  AMBIENT_SEQUENCE,
  DRIFT,
  ambientHeld,
  createAmbientCycle,
  driftDelta,
  interruptAmbient,
  nextAmbientShot,
  startAmbient,
  stepAmbient,
} from '../src/scene/ambient';
import type { AmbientCycle } from '../src/scene/ambient';
import type { Viewpoint } from '../src/state/store';

/** Runs the cycle at 60 fps for `seconds`, following every cut, and returns the shots it cut to. */
const run = (cycle: AmbientCycle, from: Viewpoint, seconds: number) => {
  const cuts: Viewpoint[] = [];
  let current = from;
  for (let t = 0; t < seconds; t += 1 / 60) {
    const next = stepAmbient(cycle, 1 / 60, current);
    if (next) {
      cuts.push(next);
      current = next;
    }
  }
  return cuts;
};

describe('ambient shot cycle', () => {
  it('visits every viewpoint in order and wraps around', () => {
    const seen: Viewpoint[] = [];
    let shot: Viewpoint = AMBIENT_SEQUENCE[0]!;
    for (let i = 0; i < AMBIENT_SEQUENCE.length; i++) {
      seen.push(shot);
      shot = nextAmbientShot(shot);
    }
    expect(new Set(seen)).toEqual(new Set<Viewpoint>(['sofa', 'tank', 'glass', 'room', 'follow']));
    expect(shot).toBe(AMBIENT_SEQUENCE[0]);
  });

  it('moves on soon after it is turned on, then holds each shot for its dwell', () => {
    const cycle = createAmbientCycle();
    startAmbient(cycle);
    expect(run(cycle, 'sofa', AMBIENT_FIRST_CUT - 0.1)).toEqual([]);
    expect(run(cycle, 'sofa', 0.2)).toEqual(['tank']);
    expect(run(cycle, 'tank', AMBIENT_DWELL.tank - 0.2)).toEqual([]);
    expect(run(cycle, 'tank', 0.4)).toEqual(['glass']);
  });

  it('cycles without any input', () => {
    const cycle = createAmbientCycle();
    startAmbient(cycle);
    const lap = AMBIENT_SEQUENCE.reduce((sum, shot) => sum + AMBIENT_DWELL[shot], 0);
    const cuts = run(cycle, 'sofa', AMBIENT_FIRST_CUT + lap + 1);
    expect(cuts).toEqual([...AMBIENT_SEQUENCE.slice(1), AMBIENT_SEQUENCE[0], AMBIENT_SEQUENCE[1]]);
  });

  it('holds the shot while the visitor has the camera, then carries on from where they are', () => {
    const cycle = createAmbientCycle();
    startAmbient(cycle);
    run(cycle, 'sofa', 2);
    interruptAmbient(cycle);
    expect(ambientHeld(cycle)).toBe(true);
    expect(run(cycle, 'room', AMBIENT_RESUME_AFTER - 0.1)).toEqual([]);
    // Interacting again restarts the wait.
    interruptAmbient(cycle);
    expect(run(cycle, 'room', AMBIENT_RESUME_AFTER - 0.1)).toEqual([]);
    // 'room' is the shot the visitor picked, so the cycle continues after it.
    expect(run(cycle, 'room', 0.2)).toEqual([nextAmbientShot('room')]);
    expect(ambientHeld(cycle)).toBe(false);
  });

  it('never shortens a shot that has longer left than the resume wait', () => {
    const cycle = createAmbientCycle();
    cycle.remaining = AMBIENT_RESUME_AFTER + 10;
    interruptAmbient(cycle);
    expect(cycle.remaining).toBe(AMBIENT_RESUME_AFTER + 10);
  });

  it('moves on by one shot at most after a long hidden-tab frame', () => {
    const cycle = createAmbientCycle();
    startAmbient(cycle);
    expect(stepAmbient(cycle, 600, 'sofa')).toBeNull();
    expect(cycle.remaining).toBeGreaterThan(0);
    expect(stepAmbient(cycle, -1, 'sofa')).toBeNull();
  });
});

describe('ambient drift', () => {
  it('starts on the shot and sways within its amplitude', () => {
    const out = { azimuth: 0, polar: 0 };
    let azimuth = 0;
    let polar = 0;
    let maxAzimuth = 0;
    let maxPolar = 0;
    const dt = 1 / 60;
    for (let t = 0; t < 120; t += dt) {
      driftDelta(t, dt, out);
      azimuth += out.azimuth;
      polar += out.polar;
      maxAzimuth = Math.max(maxAzimuth, Math.abs(azimuth));
      maxPolar = Math.max(maxPolar, Math.abs(polar));
    }
    expect(maxAzimuth).toBeLessThanOrEqual(DRIFT.azimuth + 1e-9);
    expect(maxAzimuth).toBeGreaterThan(DRIFT.azimuth * 0.9);
    expect(maxPolar).toBeLessThanOrEqual(DRIFT.polar + 1e-9);
    // Gentle: never more than a fraction of a degree per frame.
    driftDelta(0, dt, out);
    expect(Math.abs(out.azimuth)).toBeLessThan(0.001);
  });

  it('returns to the shot after a full sway', () => {
    const out = { azimuth: 0, polar: 0 };
    let azimuth = 0;
    const dt = 1 / 60;
    const steps = Math.round(DRIFT.azimuthPeriod / dt);
    for (let i = 0; i < steps; i++) azimuth += driftDelta(i * dt, dt, out).azimuth;
    expect(Math.abs(azimuth)).toBeLessThan(1e-9);
  });
});
