import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearFishRenderStatus,
  publishFishRenderStatus,
  recordFishRenderTiming,
} from '../src/systems/fishRender/fishRenderDiagnostics';
import type { FishRenderDebugCollector } from '../src/systems/fishRender/fishRenderDiagnostics';

const sample = {
  frame: 12,
  duration: 0.5,
  counts: { countA: 4, countB: 2, countC: 1 },
  activeEntities: 7,
  ema: 1.5,
  flushed: 3,
};

describe('fish render diagnostics', () => {
  beforeEach(() => {
    clearFishRenderStatus();
  });

  it('records the configured exponential moving average', () => {
    expect(recordFishRenderTiming(0, 2)).toBe(2);
    expect(recordFishRenderTiming(2, 4)).toBeCloseTo(2.12);
  });

  it('publishes status and an opt-in debug sample', () => {
    const status = { updateFreq: 1, ema: 0, activeEntities: 0, frameDuration: 0 };
    const debug = { fishRender: [] } as FishRenderDebugCollector;

    publishFishRenderStatus(status, debug, sample);

    expect(debug.fishRender).toHaveLength(1);
    expect(debug.fishRender[0]).toMatchObject(sample);
    expect(window.__vibe_renderStatus).toBe(status);
  });

  it('does not let a broken debug collector interrupt the render path', () => {
    const status = { updateFreq: 1, ema: 0, activeEntities: 0, frameDuration: 0 };
    const debug = {
      fishRender: {
        push: () => {
          throw new Error('collector failed');
        },
      },
    } as FishRenderDebugCollector;

    expect(() => publishFishRenderStatus(status, debug, sample)).not.toThrow();
  });
});
