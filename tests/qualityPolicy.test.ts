import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  QUALITY_GRACE_MS,
  QUALITY_MAX_DROPS,
  QUALITY_RECOVER_MS,
  stepQuality,
  useAquarium,
} from '../src/state/store';
import type { QualityAuto } from '../src/state/store';

const initial = useAquarium.getState();
const store = () => useAquarium.getState();

const auto = (overrides: Partial<QualityAuto> = {}): QualityAuto => ({
  quality: 'high',
  qualityCeiling: 'high',
  qualityGraceUntil: 0,
  qualityDrops: 0,
  qualityRecoverAt: 0,
  ...overrides,
});

describe('stepQuality', () => {
  it('steps down one level at a time, then stops at Lite', () => {
    expect(stepQuality(auto(), 'down', 1000)).toMatchObject({ quality: 'medium' });
    expect(stepQuality(auto({ quality: 'medium' }), 'down', 1000)).toMatchObject({
      quality: 'low',
    });
    expect(stepQuality(auto({ quality: 'low' }), 'down', 1000)).toBeNull();
  });

  it('ignores both directions inside the grace period', () => {
    const state = auto({ quality: 'medium', qualityGraceUntil: 2000 });
    expect(stepQuality(state, 'down', 1999)).toBeNull();
    expect(stepQuality(state, 'up', 1999)).toBeNull();
    expect(stepQuality(state, 'down', 2000)).not.toBeNull();
  });

  it('starts a grace and a recovery wait that doubles with each drop', () => {
    expect(stepQuality(auto(), 'down', 1000)).toEqual({
      quality: 'medium',
      qualityGraceUntil: 1000 + QUALITY_GRACE_MS,
      qualityDrops: 1,
      qualityRecoverAt: 1000 + QUALITY_RECOVER_MS,
    });
    expect(stepQuality(auto({ qualityDrops: 2 }), 'down', 1000)).toMatchObject({
      qualityDrops: 3,
      qualityRecoverAt: 1000 + QUALITY_RECOVER_MS * 4,
    });
  });

  it('steps up only after the recovery wait, one level at a time', () => {
    const state = auto({ quality: 'low', qualityDrops: 1, qualityRecoverAt: 5000 });
    expect(stepQuality(state, 'up', 4999)).toBeNull();
    expect(stepQuality(state, 'up', 5000)).toEqual({
      quality: 'medium',
      qualityGraceUntil: 5000 + QUALITY_GRACE_MS,
    });
    expect(stepQuality({ ...state, quality: 'medium' }, 'up', 5000)).toMatchObject({
      quality: 'high',
    });
  });

  it("never steps above the user's choice", () => {
    expect(stepQuality(auto(), 'up', 1000)).toBeNull();
    expect(stepQuality(auto({ quality: 'low', qualityCeiling: 'low' }), 'up', 1000)).toBeNull();
    expect(
      stepQuality(auto({ quality: 'medium', qualityCeiling: 'medium' }), 'up', 1000)
    ).toBeNull();
  });

  it('stops stepping up after too many drops', () => {
    const state = auto({ quality: 'low', qualityDrops: QUALITY_MAX_DROPS - 1 });
    expect(stepQuality(state, 'up', 1000)).not.toBeNull();
    expect(stepQuality({ ...state, qualityDrops: QUALITY_MAX_DROPS }, 'up', 1e9)).toBeNull();
  });

  it('settles instead of oscillating under a monitor that flips every sample', () => {
    let state = auto({ qualityGraceUntil: 0 });
    let changes = 0;
    // The monitor reports every 2.5 s, alternating decline and incline, for ten minutes.
    for (let i = 0; i < 240; i++) {
      const step = stepQuality(state, i % 2 === 0 ? 'down' : 'up', i * 2500);
      if (step) {
        state = { ...state, ...step };
        changes++;
      }
    }
    // Two drops to Lite, then each climb waits longer, and the climbs end after the fourth drop.
    expect(state.qualityDrops).toBe(QUALITY_MAX_DROPS);
    expect(changes).toBeLessThan(12);
  });
});

describe('automatic quality steps in the store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAquarium.setState(initial, true);
  });
  afterEach(() => vi.useRealTimers());

  it('ignores the monitor during the grace period after a manual switch to High', () => {
    store().setQuality('low');
    store().setQuality('high');
    vi.advanceTimersByTime(QUALITY_GRACE_MS - 1);
    store().autoDowngrade();
    expect(store()).toMatchObject({ quality: 'high', qualityNotice: false });

    vi.advanceTimersByTime(1);
    store().autoDowngrade();
    expect(store()).toMatchObject({ quality: 'medium', qualityDrops: 1, qualityNotice: false });
  });

  it('restarts the grace once the post stack mounts', () => {
    store().setQuality('high');
    vi.advanceTimersByTime(QUALITY_GRACE_MS - 1000);
    store().holdQuality();
    vi.advanceTimersByTime(QUALITY_GRACE_MS - 1);
    store().autoDowngrade();
    expect(store().quality).toBe('high');

    vi.advanceTimersByTime(1);
    store().autoDowngrade();
    expect(store().quality).toBe('medium');
  });

  it('never shortens a running grace', () => {
    store().setQuality('high');
    store().holdQuality();
    vi.advanceTimersByTime(QUALITY_GRACE_MS - 1);
    store().autoDowngrade();
    expect(store().quality).toBe('high');
  });

  it('announces only the drop to Lite, and recovers to High after a slowdown', () => {
    store().setQuality('high');
    vi.advanceTimersByTime(QUALITY_GRACE_MS);
    store().autoDowngrade();
    expect(store()).toMatchObject({ quality: 'medium', qualityNotice: false });
    vi.advanceTimersByTime(QUALITY_GRACE_MS);
    store().autoDowngrade();
    expect(store()).toMatchObject({ quality: 'low', qualityNotice: true, qualityDrops: 2 });

    // The second drop asks for twice the base wait before the first step back up.
    vi.advanceTimersByTime(QUALITY_RECOVER_MS * 2 - 1);
    store().autoUpgrade();
    expect(store().quality).toBe('low');
    vi.advanceTimersByTime(1);
    store().autoUpgrade();
    expect(store()).toMatchObject({ quality: 'medium', qualityNotice: false });
    vi.advanceTimersByTime(QUALITY_GRACE_MS);
    store().autoUpgrade();
    expect(store().quality).toBe('high');
    store().autoUpgrade();
    expect(store().quality).toBe('high');
  });

  it('keeps a manual Lite choice, and a new manual choice resets the drops', () => {
    store().setQuality('low');
    vi.advanceTimersByTime(QUALITY_RECOVER_MS * 10);
    store().autoUpgrade();
    store().autoDowngrade();
    expect(store()).toMatchObject({ quality: 'low', qualityDrops: 0, qualityNotice: false });

    useAquarium.setState({ qualityDrops: QUALITY_MAX_DROPS, qualityNotice: true });
    store().setQuality('high');
    expect(store()).toMatchObject({
      quality: 'high',
      qualityCeiling: 'high',
      qualityDrops: 0,
      qualityRecoverAt: 0,
      qualityNotice: false,
    });
  });

  it('lets the Lite notice be dismissed', () => {
    useAquarium.setState({ quality: 'medium', qualityGraceUntil: 0 });
    store().autoDowngrade();
    store().dismissQualityNotice();
    expect(store()).toMatchObject({ quality: 'low', qualityNotice: false });
  });
});
