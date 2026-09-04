export type FishRenderDebugSample = {
  frame: number;
  duration: number;
  counts: { countA: number; countB: number; countC: number };
  activeEntities: number;
  ema: number;
  flushed?: number;
};

export type FishRenderDebugCollector = {
  fishRender: Array<{
    frame?: number;
    duration: number;
    counts?: { countA: number; countB: number; countC: number };
    activeEntities?: number;
    ema?: number;
    flushed?: number;
  }>;
};

const DEFAULT_EMA_ALPHA = 0.06;

export function recordFishRenderTiming(
  previousEma: number,
  frameDuration: number,
  alpha = DEFAULT_EMA_ALPHA
): number {
  return previousEma ? previousEma + (frameDuration - previousEma) * alpha : frameDuration;
}

export function publishFishRenderStatus(
  status: VibeRenderStatus & {
    updateFreq: number;
    ema: number;
    activeEntities: number;
    frameDuration: number;
  },
  debug: FishRenderDebugCollector | undefined,
  sample?: FishRenderDebugSample
): void {
  try {
    if (typeof window !== 'undefined') {
      if (debug) window.__vibe_renderStatus = status;
      else if (window.__vibe_renderStatus) delete window.__vibe_renderStatus;
    }
    if (debug && sample) {
      debug.fishRender.push({
        frame: sample.frame,
        duration: sample.duration,
        counts: {
          countA: sample.counts.countA,
          countB: sample.counts.countB,
          countC: sample.counts.countC,
        },
        activeEntities: sample.activeEntities,
        ema: sample.ema,
        flushed: sample.flushed,
      });
    }
  } catch {
    // Diagnostics must not interrupt simulation visuals.
  }
}

export function clearFishRenderStatus(): void {
  if (typeof window !== 'undefined' && window.__vibe_renderStatus) {
    delete window.__vibe_renderStatus;
  }
}
