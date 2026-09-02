import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { SchedulerSystem } from '../src/systems/SchedulerSystem';
import { useGameStore } from '../src/gameStore';
import { fixedScheduler } from '../src/utils/FixedStepScheduler';

type FrameCallback = (state: unknown, delta: number) => void;

const frameCallbacks: FrameCallback[] = [];

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: FrameCallback) => {
    frameCallbacks.push(cb);
  },
}));

declare global {
  interface Window {
    __vibe_poc_enabled?: boolean;
  }
}

describe('SchedulerSystem adaptive behaviors', () => {
  beforeEach(() => {
    frameCallbacks.length = 0;
    useGameStore.setState({ visualQualityOverrides: {} });
    fixedScheduler.setMaxSubSteps(5);
    delete window.__vibe_poc_enabled;
    delete window.__vibe_debug;
    delete window.__vibe_schedStatus;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    frameCallbacks.length = 0;
    delete window.__vibe_debug;
    delete window.__vibe_schedStatus;
  });

  const renderSystem = () =>
    render(
      <VisualQualityProvider>
        <SchedulerSystem />
      </VisualQualityProvider>
    );

  it('keeps the baseline path when adaptive scheduling is disabled', () => {
    const setMaxSubStepsSpy = vi.spyOn(fixedScheduler, 'setMaxSubSteps');
    const nowSpy = vi.spyOn(performance, 'now');

    const { unmount } = renderSystem();

    expect(frameCallbacks).toHaveLength(1);

    nowSpy.mockClear();
    act(() => {
      frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    expect(setMaxSubStepsSpy).not.toHaveBeenCalled();
    expect(nowSpy).not.toHaveBeenCalled();
    expect(fixedScheduler.getMaxSubSteps()).toBe(5);
    expect(window.__vibe_schedStatus).toBeUndefined();

    unmount();
  });

  it('publishes a stable status object when telemetry is explicitly enabled', () => {
    window.__vibe_debug = {
      simulateStep: [],
      fishRender: [],
      fishUseFrame: [],
      scheduler: [],
    };
    const nowSpy = vi.spyOn(performance, 'now');

    const { unmount } = renderSystem();

    nowSpy.mockReset().mockReturnValueOnce(10).mockReturnValueOnce(12);
    act(() => {
      frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    const firstStatus = window.__vibe_schedStatus;
    expect(nowSpy).toHaveBeenCalledTimes(2);
    expect(firstStatus?.lastDuration).toBe(2);
    expect(window.__vibe_debug?.scheduler).toHaveLength(1);

    nowSpy.mockReset().mockReturnValueOnce(20).mockReturnValueOnce(23);
    act(() => {
      frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    expect(window.__vibe_schedStatus).toBe(firstStatus);
    expect(window.__vibe_schedStatus?.lastDuration).toBe(3);
    expect(window.__vibe_debug?.scheduler).toHaveLength(2);

    unmount();
  });

  it('reduces max sub-steps when the adaptive PoC triggers', () => {
    useGameStore.setState({ visualQualityOverrides: { adaptiveSchedulerEnabled: true } });
    window.__vibe_poc_enabled = true;

    const setMaxSubStepsSpy = vi.spyOn(fixedScheduler, 'setMaxSubSteps');
    let nowTick = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (nowTick += 10));

    const { unmount } = renderSystem();

    expect(frameCallbacks).toHaveLength(1);

    act(() => {
      frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    expect(setMaxSubStepsSpy).toHaveBeenCalledWith(1);

    unmount();
  });
});
