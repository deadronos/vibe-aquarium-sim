import type { SimulationInput, SimulationOutput } from '../../workers/boids/types';
import { simulateStep } from '../../workers/boids/index';

export function runMainThreadStep(input: SimulationInput): SimulationOutput {
  const t0 = performance.now();
  const result = simulateStep(input);
  const t1 = performance.now();
  try {
    const dbg = typeof window !== 'undefined' ? window.__vibe_debug : null;
    if (dbg) {
      dbg.simulateStep.push({
        duration: t1 - t0,
        time: Date.now(),
        fishCount: input.fishCount,
      });
    }
  } catch {
    /* ignore optional diagnostics */
  }
  return result;
}
