import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyQualityShadowMap,
  AdaptiveQualityManager,
} from '../src/performance/AdaptiveQualityManager';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { getQualitySettings } from '../src/performance/qualityPresets';
import { useQualityStore } from '../src/performance/qualityStore';
import { ensurePerfDebug } from '../src/utils/perfDebug';
import { recordQualityTransition } from '../src/performance/qualityTelemetry';

const { setDpr } = vi.hoisted(() => ({ setDpr: vi.fn() }));

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: (state: unknown, delta: number) => void) => {
    // Keep only the most recently rendered callback so a store update does not
    // accidentally replay a stale closure in this deterministic harness.
    frameCallback = callback;
  },
  useThree: (selector: (state: { setDpr: typeof setDpr }) => unknown) => selector({ setDpr }),
}));

let frameCallback: ((state: unknown, delta: number) => void) | undefined;

describe('adaptive quality shadow transitions', () => {
  const initialState = useQualityStore.getState();

  beforeEach(() => {
    frameCallback = undefined;
    setDpr.mockClear();
    delete window.__vibe_debug;
    act(() => {
      useQualityStore.setState({
        level: 'high',
        settings: getQualitySettings('high', 2),
        isAdaptiveEnabled: true,
        fpsEma: 60,
      });
    });
  });

  afterEach(() => {
    act(() => useQualityStore.setState(initialState, true));
    delete window.__vibe_debug;
  });

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

  it('records bounded downshift and recovery transitions only with diagnostics enabled', async () => {
    ensurePerfDebug();
    render(
      <VisualQualityProvider isWebGPU={false}>
        <AdaptiveQualityManager />
      </VisualQualityProvider>
    );

    const runFrames = async (count: number, delta: number) => {
      for (let offset = 0; offset < count; offset += 24) {
        await act(async () => {
          for (let i = 0; i < Math.min(24, count - offset); i++) {
            frameCallback?.({}, delta);
          }
        });
      }
    };

    await runFrames(360, 1 / 30);
    expect(useQualityStore.getState().level).toBe('low');
    expect(window.__vibe_debug?.qualityTransitions?.map((entry) => entry.reason)).toEqual([
      'low-fps',
      'low-fps',
    ]);

    await runFrames(480, 1 / 60);
    expect(useQualityStore.getState().level).toBe('medium');
    expect(window.__vibe_debug?.qualityTransitions?.map((entry) => entry.reason)).toEqual([
      'low-fps',
      'low-fps',
      'high-fps',
    ]);

    const transitions = window.__vibe_debug?.qualityTransitions;
    expect(transitions).toHaveLength(3);
    for (let i = 0; i < 40; i++) {
      recordQualityTransition({
        from: 'high',
        to: 'ultra',
        backend: 'webgl',
        ema: 60,
        reason: 'high-fps',
      });
    }
    expect(transitions).toHaveLength(32);
  });

  it('does not allocate transition telemetry when diagnostics are disabled', async () => {
    render(
      <VisualQualityProvider>
        <AdaptiveQualityManager />
      </VisualQualityProvider>
    );

    await act(async () => {
      for (let i = 0; i < 120; i++) frameCallback?.({}, 1 / 30);
    });

    expect(window.__vibe_debug).toBeUndefined();
  });
});
