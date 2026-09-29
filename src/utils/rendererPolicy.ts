export type RendererBackend = 'webgl' | 'webgpu';
export type RendererPreference = RendererBackend;
export type RendererKind = RendererPreference;

type RendererWithBackend = {
  backend?: { isWebGPUBackend?: boolean };
};

/**
 * Resolves the renderer requested by the URL. WebGL is the safe default;
 * WebGPU is an explicit opt-in so unsupported or visually-regressed browsers
 * do not silently change the production rendering path.
 */
export function resolveRendererPreference(search: string): RendererPreference {
  const requested = new URLSearchParams(search).get('renderer')?.toLowerCase();
  return requested === 'webgpu' ? 'webgpu' : 'webgl';
}

/**
 * Selects the renderer after capability detection. An unavailable WebGPU
 * request always falls back to WebGL.
 */
export function selectRenderer(
  preference: RendererPreference,
  webgpuAvailable: boolean
): RendererKind {
  return preference === 'webgpu' && webgpuAvailable ? 'webgpu' : 'webgl';
}

/** Returns true only when Three is actively using its WebGPU backend. */
export function isWebGPURendererBackend(renderer: RendererWithBackend): boolean {
  return renderer.backend?.isWebGPUBackend === true;
}

/** Maps the `isWebGPU` flag used across components to a backend identifier. */
export function toRendererBackend(isWebGPU: boolean): RendererBackend {
  return isWebGPU ? 'webgpu' : 'webgl';
}

/** Publishes the active renderer status for debug tooling. */
export function setRendererStatus(status: VibeRendererStatus): void {
  window.__vibe_rendererStatus = status;
}

/**
 * Builds the shared renderer options applied to every renderer we construct —
 * both the WebGL renderer and the WebGPU wrapper receive this same shape.
 */
export function createRendererOptions<T extends object>(props: T) {
  return {
    ...props,
    powerPreference: 'high-performance' as const,
    antialias: true,
    alpha: true,
  };
}
