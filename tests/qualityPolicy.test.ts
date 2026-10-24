import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUALITY_GRACE_MS, useAquarium } from '../src/state/store';

const initial = useAquarium.getState();
const store = () => useAquarium.getState();

describe('automatic quality downgrade', () => {
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
    expect(store()).toMatchObject({ quality: 'low', autoDowngraded: true, qualityNotice: true });
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
    expect(store().quality).toBe('low');
  });

  it('never shortens a running grace', () => {
    store().setQuality('high');
    store().holdQuality();
    vi.advanceTimersByTime(QUALITY_GRACE_MS - 1);
    store().autoDowngrade();
    expect(store().quality).toBe('high');
  });

  it('downgrades at most once per manual choice', () => {
    store().setQuality('high');
    vi.advanceTimersByTime(QUALITY_GRACE_MS);
    store().autoDowngrade();
    expect(store().quality).toBe('low');

    // Something switches back without the user: the monitor must not take it away again.
    useAquarium.setState({ quality: 'high' });
    vi.advanceTimersByTime(QUALITY_GRACE_MS * 4);
    store().autoDowngrade();
    expect(store().quality).toBe('high');

    // A new manual choice earns a new, single downgrade after its grace.
    store().setQuality('high');
    expect(store()).toMatchObject({ autoDowngraded: false, qualityNotice: false });
    vi.advanceTimersByTime(QUALITY_GRACE_MS);
    store().autoDowngrade();
    expect(store()).toMatchObject({ quality: 'low', qualityNotice: true });
  });

  it('leaves Lite alone and lets the notice be dismissed', () => {
    store().setQuality('low');
    vi.advanceTimersByTime(QUALITY_GRACE_MS);
    store().autoDowngrade();
    expect(store()).toMatchObject({ quality: 'low', autoDowngraded: false, qualityNotice: false });

    store().setQuality('high');
    vi.advanceTimersByTime(QUALITY_GRACE_MS);
    store().autoDowngrade();
    store().dismissQualityNotice();
    expect(store()).toMatchObject({ quality: 'low', qualityNotice: false });
  });
});
