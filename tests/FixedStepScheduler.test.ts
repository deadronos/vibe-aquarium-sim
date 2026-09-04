import { describe, it, expect, vi } from 'vitest';
import { FixedStepScheduler } from '../src/utils/FixedStepScheduler';

describe('FixedStepScheduler', () => {
  it('should call callbacks based on accumulated delta', () => {
    const scheduler = new FixedStepScheduler(1 / 60);
    const callback = vi.fn();
    scheduler.add(callback);

    // Update with less than step
    scheduler.update(1 / 120);
    expect(callback).not.toHaveBeenCalled();

    // Update to reach step
    scheduler.update(1 / 120 + 0.0001); // Small epsilon
    expect(callback).toHaveBeenCalledTimes(1);

    // Update with multiple steps
    callback.mockClear();
    scheduler.update(3 / 60); // 3 steps
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should clamp max substeps', () => {
    const scheduler = new FixedStepScheduler(1 / 60, 5);
    const callback = vi.fn();
    scheduler.add(callback);

    scheduler.update(10 / 60); // 10 steps worth
    expect(callback).toHaveBeenCalledTimes(5);
  });

  it('should advance exactly one fixed step for physics hooks', () => {
    const scheduler = new FixedStepScheduler(1 / 60);
    const callback = vi.fn();
    scheduler.add(callback);

    expect(scheduler.step()).toBe(1);
    expect(callback).toHaveBeenCalledWith(1 / 60);
    expect(scheduler.alpha).toBe(0);
  });
});
