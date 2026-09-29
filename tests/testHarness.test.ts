import { afterEach, describe, expect, it } from 'vitest';
import {
  getTestHarness,
  installTestHarness,
  isTestHarnessEnabled,
  resetTestHarness,
  tickTestHarnessFrame,
} from '../src/utils/testHarness';

afterEach(() => {
  resetTestHarness();
});

describe('test harness', () => {
  it('is opt-in through the query string only', () => {
    expect(isTestHarnessEnabled('')).toBe(false);
    expect(isTestHarnessEnabled('?renderer=webgpu')).toBe(false);
    expect(isTestHarnessEnabled('?testHarness=1')).toBe(true);
  });

  it('installs a single harness on window and exposes poses', () => {
    const harness = installTestHarness();
    expect(installTestHarness()).toBe(harness);
    expect(window.__vibe_test).toBe(harness);
    expect(getTestHarness()).toBe(harness);

    harness.setFishPose(0, 1, 2, 3);
    harness.setAllPoses([{ x: -1, y: 0, z: 0.5 }]);
    expect(harness.poses.size).toBe(1);
    expect(harness.poses.get(0)?.toArray()).toEqual([-1, 0, 0.5]);

    harness.setFishPose(4, 0.1, 0.2, 0.3);
    expect(harness.poses.get(4)?.toArray()).toEqual([0.1, 0.2, 0.3]);

    harness.clearPoses();
    expect(harness.poses.size).toBe(0);
  });

  it('toggles the frozen flag', () => {
    const harness = installTestHarness();
    expect(harness.frozen).toBe(false);
    harness.freeze();
    expect(harness.frozen).toBe(true);
    harness.unfreeze();
    expect(harness.frozen).toBe(false);
  });

  it('resolves frame waiters as frames advance', async () => {
    const harness = installTestHarness();
    let resolved = false;
    const pending = harness.waitForFrames(3).then(() => {
      resolved = true;
    });

    tickTestHarnessFrame();
    tickTestHarnessFrame();
    expect(resolved).toBe(false);
    expect(harness.frame).toBe(2);

    tickTestHarnessFrame();
    await pending;
    expect(resolved).toBe(true);
    expect(harness.frame).toBe(3);
  });

  it('clamps frame waits to at least one frame and tears down cleanly', async () => {
    const harness = installTestHarness();
    const pending = harness.waitForFrames(0);
    tickTestHarnessFrame();
    expect(harness.frame).toBe(1);
    await pending;

    resetTestHarness();
    expect(getTestHarness()).toBeNull();
    expect(window.__vibe_test).toBeUndefined();
  });
});
