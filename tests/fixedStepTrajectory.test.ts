import { describe, expect, it } from 'vitest';
import { runFixedStepTrajectory } from './support/fixedStepTrajectory';

const renderRates = [30, 60, 120] as const;

describe('fixed-step refresh-rate trajectory', () => {
  it.each(renderRates)('executes 60 fixed ticks per second at %d Hz', (renderHz) => {
    const trace = runFixedStepTrajectory({ renderHz, durationSeconds: 1 });

    expect(trace.tickCount).toBe(60);
  });

  it('keeps final position and velocity equivalent across display rates', () => {
    const traces = renderRates.map((renderHz) =>
      runFixedStepTrajectory({ renderHz, durationSeconds: 2 })
    );
    const baseline = traces[0]!.final;

    for (const trace of traces.slice(1)) {
      expect(trace.final.position.x).toBeCloseTo(baseline.position.x, 9);
      expect(trace.final.position.y).toBeCloseTo(baseline.position.y, 9);
      expect(trace.final.position.z).toBeCloseTo(baseline.position.z, 9);
      expect(trace.final.velocity.x).toBeCloseTo(baseline.velocity.x, 9);
      expect(trace.final.velocity.y).toBeCloseTo(baseline.velocity.y, 9);
      expect(trace.final.velocity.z).toBeCloseTo(baseline.velocity.z, 9);
    }
  });

  it('replays an identical tick trace for identical inputs', () => {
    const first = runFixedStepTrajectory({ renderHz: 60, durationSeconds: 2 });
    const second = runFixedStepTrajectory({ renderHz: 60, durationSeconds: 2 });

    expect(second).toEqual(first);
  });

  it('rejects unsupported rates and non-positive durations', () => {
    expect(() =>
      runFixedStepTrajectory({ renderHz: 59 as unknown as 30, durationSeconds: 1 })
    ).toThrow('renderHz must be 30, 60, or 120');
    expect(() => runFixedStepTrajectory({ renderHz: 60, durationSeconds: 0 })).toThrow(
      'durationSeconds must be positive'
    );
  });
});
