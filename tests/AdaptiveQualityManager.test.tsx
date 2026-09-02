import { describe, expect, it, vi } from 'vitest';
import { applyQualityShadowMap } from '../src/performance/AdaptiveQualityManager';

describe('adaptive quality shadow transitions', () => {
  it('does not resize or dispose a WebGPU shadow map', () => {
    const set = vi.fn();
    const light = {
      shadow: {
        mapSize: { width: 512, height: 512, set },
        needsUpdate: false,
        map: { dispose: vi.fn() },
      },
    };

    applyQualityShadowMap(light as never, 256, 'webgpu');

    expect(set).not.toHaveBeenCalled();
    expect(light.shadow.map.dispose).not.toHaveBeenCalled();
    expect(light.shadow.needsUpdate).toBe(false);
  });
});
