import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { AdaptiveQualityManager } from '../src/performance/AdaptiveQualityManager';
import { getQualitySettings } from '../src/performance/qualityPresets';
import { useQualityStore } from '../src/performance/qualityStore';

const { mockedSetDpr } = vi.hoisted(() => ({
  mockedSetDpr: vi.fn(),
}));

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');

  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: (selector: (state: { setDpr: typeof mockedSetDpr }) => unknown) =>
      selector({ setDpr: mockedSetDpr }),
  };
});

describe('AdaptiveQualityManager DPR behavior', () => {
  const initialQualityState = useQualityStore.getState();

  beforeEach(() => {
    mockedSetDpr.mockClear();
    vi.stubGlobal('window', { ...window, devicePixelRatio: 2 });

    act(() => {
      useQualityStore.setState(
        {
          ...initialQualityState,
          isAdaptiveEnabled: true,
          level: 'high',
          settings: getQualitySettings('high', 2),
          fpsEma: 60,
        },
        true
      );
    });
  });

  afterEach(() => {
    act(() => {
      useQualityStore.setState(initialQualityState, true);
    });

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('caps DPR at 1 on WebGPU', () => {
    render(
      <VisualQualityProvider isWebGPU>
        <AdaptiveQualityManager />
      </VisualQualityProvider>
    );

    expect(mockedSetDpr).toHaveBeenCalledWith(1);
  });

  it('keeps preset DPR on WebGL', () => {
    render(
      <VisualQualityProvider isWebGPU={false}>
        <AdaptiveQualityManager />
      </VisualQualityProvider>
    );

    expect(mockedSetDpr).toHaveBeenCalledWith(getQualitySettings('high', 2).dpr);
  });
});
