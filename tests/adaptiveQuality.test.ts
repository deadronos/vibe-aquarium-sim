import { describe, expect, test } from 'vitest';
import { getQualitySettings, getPresetDpr } from '../src/performance/qualityPresets';

describe('adaptive quality presets', () => {
  test('clamps DPR to device max', () => {
    expect(getPresetDpr('ultra', 1)).toBe(1);
    expect(getPresetDpr('low', 1)).toBeCloseTo(0.75);
  });

  test('quality settings are internally consistent', () => {
    const s = getQualitySettings('high', 2);
    expect(s.level).toBe('high');
    expect(s.dpr).toBeGreaterThan(0);
    expect(s.tankTransmissionResolution).toBeGreaterThan(0);
    expect(s.tankTransmissionSamples).toBeGreaterThan(0);
    expect(s.shadowMapSize).toBeGreaterThan(0);
  });
});
