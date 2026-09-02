import type { QualityLevel } from './qualityPresets';
import type { RendererBackend } from './qualityProfile';

export type QualityTransitionReason = 'low-fps' | 'high-fps' | 'device-clamp';

const MAX_QUALITY_TRANSITIONS = 32;

export const recordQualityTransition = ({
  from,
  to,
  backend,
  ema,
  reason,
}: {
  from: QualityLevel;
  to: QualityLevel;
  backend: RendererBackend;
  ema: number;
  reason: QualityTransitionReason;
}): void => {
  if (typeof window === 'undefined') return;
  const collector = window.__vibe_debug;
  if (!collector) return;

  const transitions = (collector.qualityTransitions ??= []);
  if (transitions.length >= MAX_QUALITY_TRANSITIONS) transitions.splice(0, 1);
  transitions.push({ from, to, backend, ema, reason, time: performance.now() });
};
