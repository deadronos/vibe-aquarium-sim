import { describe, expect, it } from 'vitest';
import {
  isWebGPURendererBackend,
  resolveRendererPreference,
  selectRenderer,
} from '../src/utils/rendererPolicy';

describe('renderer policy', () => {
  it('defaults to WebGL and only opts into WebGPU explicitly', () => {
    expect(resolveRendererPreference('')).toBe('webgl');
    expect(resolveRendererPreference('?renderer=webgl')).toBe('webgl');
    expect(resolveRendererPreference('?renderer=webgpu')).toBe('webgpu');
    expect(resolveRendererPreference('?renderer=unexpected')).toBe('webgl');
  });

  it('falls back to WebGL when an explicit WebGPU request is unavailable', () => {
    expect(selectRenderer('webgpu', false)).toBe('webgl');
    expect(selectRenderer('webgpu', true)).toBe('webgpu');
    expect(selectRenderer('webgl', true)).toBe('webgl');
  });

  it('reports the active backend rather than the renderer wrapper type', () => {
    expect(isWebGPURendererBackend({ backend: { isWebGPUBackend: true } })).toBe(true);
    expect(isWebGPURendererBackend({ backend: { isWebGPUBackend: false } })).toBe(false);
    expect(isWebGPURendererBackend({})).toBe(false);
  });
});
