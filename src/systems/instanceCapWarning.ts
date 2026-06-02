/** Maximum instanced mesh instances per model (Three.js WebGL limitation for instanced rendering). */
export const MAX_INSTANCES_PER_MODEL = 1000;

const warnedModels = new Set<number>();

/**
 * Emit a throttled console.warn when fish exceed the per-model instance cap.
 * Only warns once per model index per session.
 */
export function warnInstanceCap(modelIndex: number, totalFishCount: number): void {
  if (!warnedModels.has(modelIndex)) {
    warnedModels.add(modelIndex);
    console.warn(
      `[FishRenderSystem] Per-model instance cap reached for model ${modelIndex} ` +
        `(MAX_INSTANCES_PER_MODEL = ${MAX_INSTANCES_PER_MODEL}). ` +
        `Fish beyond ${MAX_INSTANCES_PER_MODEL} of this model will not be rendered. ` +
        `Total fish of this model: ${totalFishCount}. ` +
        `Consider reducing the total fish count.`
    );
  }
}

/** Reset all cap warnings (useful for testing). */
export function resetInstanceCapWarnings(): void {
  warnedModels.clear();
}
