export type RendererPreference = 'webgl' | 'webgpu';
export type RendererKind = RendererPreference;

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
