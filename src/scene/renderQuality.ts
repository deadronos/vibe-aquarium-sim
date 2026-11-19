import type { Quality } from '../state/store';

export const shadowMapSizeForQuality = (quality: Quality): readonly [number, number] =>
  quality === 'low' ? [1024, 1024] : [2048, 2048];

/** Avoid multisampled depth resolve/blit combinations rejected by some software drivers. */
export const EFFECT_COMPOSER_OPTIONS = {
  depthBuffer: true,
  stencilBuffer: false,
  multisampling: 0,
} as const;

export interface RenderProfileSnapshot {
  quality: Quality;
  shadowMapSize: number;
  frames: number;
  avgFrameMs: number;
  minFrameMs: number;
  maxFrameMs: number;
  p95FrameMs: number;
  fps: number;
  drawCalls: number;
  triangles: number;
}

/** Fixed-capacity frame sampler used only by the explicit `?profile=1` benchmark mode. */
export class FrameProfile {
  private readonly samples: Float64Array;
  private readonly sorted: Float64Array;
  private index = 0;
  private count = 0;
  private drawCalls = 0;
  private triangles = 0;

  constructor(capacity = 300) {
    this.samples = new Float64Array(capacity);
    this.sorted = new Float64Array(capacity);
  }

  reset() {
    this.index = 0;
    this.count = 0;
    this.drawCalls = 0;
    this.triangles = 0;
  }

  record(frameMs: number, drawCalls: number, triangles: number) {
    if (!Number.isFinite(frameMs) || frameMs <= 0) return;
    this.samples[this.index] = frameMs;
    this.index = (this.index + 1) % this.samples.length;
    this.count = Math.min(this.count + 1, this.samples.length);
    this.drawCalls = drawCalls;
    this.triangles = triangles;
  }

  snapshot(quality: Quality, shadowMapSize: number): RenderProfileSnapshot {
    if (this.count === 0) {
      return {
        quality,
        shadowMapSize,
        frames: 0,
        avgFrameMs: 0,
        minFrameMs: 0,
        maxFrameMs: 0,
        p95FrameMs: 0,
        fps: 0,
        drawCalls: this.drawCalls,
        triangles: this.triangles,
      };
    }
    let sum = 0;
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (let i = 0; i < this.count; i++) {
      const sample = this.samples[i]!;
      this.sorted[i] = sample;
      sum += sample;
      min = Math.min(min, sample);
      max = Math.max(max, sample);
    }
    this.sorted.subarray(0, this.count).sort();
    const avg = sum / this.count;
    return {
      quality,
      shadowMapSize,
      frames: this.count,
      avgFrameMs: avg,
      minFrameMs: min,
      maxFrameMs: max,
      p95FrameMs: this.sorted[Math.max(0, Math.ceil(this.count * 0.95) - 1)]!,
      fps: 1000 / avg,
      drawCalls: this.drawCalls,
      triangles: this.triangles,
    };
  }
}
