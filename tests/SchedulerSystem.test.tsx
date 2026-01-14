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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    frameCallbacks.length = 0;
  });

  const renderSystem = () =>
    render(
      <VisualQualityProvider>
        <SchedulerSystem />
      </VisualQualityProvider>
    );

  it('keeps the baseline path when adaptive scheduling is disabled', () => {
    const setMaxSubStepsSpy = vi.spyOn(fixedScheduler, 'setMaxSubSteps');

    const { unmount } = renderSystem();

    expect(frameCallbacks).toHaveLength(1);

    act(() => {
      frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    expect(setMaxSubStepsSpy).not.toHaveBeenCalled();
    expect(fixedScheduler.getMaxSubSteps()).toBe(5);

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
