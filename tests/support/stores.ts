import { world } from '../../src/store';
import { useGameStore } from '../../src/gameStore';
import { useQualityStore } from '../../src/performance/qualityStore';
import { getQualitySettings, type QualityLevel } from '../../src/performance/qualityPresets';

/**
 * Removes every entity from the shared Miniplex world. `World.clear()` removes
 * entities through the bucket, so queries are re-indexed and no stale entries
 * leak between tests.
 */
export function resetWorld(): void {
  world.clear();
}

/**
 * Restores `useGameStore` to the exact state captured at store creation
 * (data + actions).
 */
export function resetGameStore(): void {
  useGameStore.setState(useGameStore.getInitialState(), true);
}

/**
 * Restores `useQualityStore` to its initial state. When `level` is supplied,
 * the initial state is used as the base and the level's settings (evaluated at
 * device DPR 2, matching the test suite's convention) are applied on top.
 */
export function resetQualityStore(level?: QualityLevel): void {
  const initialState = useQualityStore.getInitialState();

  if (!level) {
    useQualityStore.setState(initialState, true);
    return;
  }

  const settings = getQualitySettings(level, 2);
  useQualityStore.setState(
    {
      ...initialState,
      level,
      settings,
      instanceUpdateBudget: settings.instanceUpdateBudget,
    },
    true
  );
}

/** Deletes the project's `window.__vibe_*` telemetry/debug globals. */
export function clearVibeGlobals(): void {
  delete window.__vibe_debug;
  delete window.__vibe_renderStatus;
  delete window.__vibe_schedStatus;
  delete window.__vibe_transportStatus;
  delete window.__vibe_rendererStatus;
}
