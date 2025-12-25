import { describe, expect, test, vi, afterEach } from 'vitest';
import {
  getQualitySettings,
  getPresetDpr,
  nextLowerQuality,
  nextHigherQuality,
  clampShadowMapSize,
  getDeviceMaxDpr
} from '../src/performance/qualityPresets';

describe('adaptive quality presets', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('clamps DPR to device max', () => {
    expect(getPresetDpr('ultra', 1)).toBe(1);
    expect(getPresetDpr('low', 1)).toBeCloseTo(0.75);
    expect(getPresetDpr('medium', 2)).toBe(1);
    expect(getPresetDpr('high', 2)).toBe(1.25);
    expect(getPresetDpr('ultra', 2)).toBe(1.5);
  });

  test('quality settings are internally consistent', () => {
    const s = getQualitySettings('high', 2);
    expect(s.level).toBe('high');
    expect(s.dpr).toBeGreaterThan(0);
    expect(s.tankTransmissionResolution).toBeGreaterThan(0);
    expect(s.tankTransmissionSamples).toBeGreaterThan(0);
    expect(s.shadowMapSize).toBeGreaterThan(0);
  });

  test('nextLowerQuality returns correct levels', () => {
    expect(nextLowerQuality('ultra')).toBe('high');
    expect(nextLowerQuality('high')).toBe('medium');
    expect(nextLowerQuality('medium')).toBe('low');
    expect(nextLowerQuality('low')).toBe('low');
  });

  test('nextHigherQuality returns correct levels', () => {
    expect(nextHigherQuality('low')).toBe('medium');
    expect(nextHigherQuality('medium')).toBe('high');
    expect(nextHigherQuality('high')).toBe('ultra');
    expect(nextHigherQuality('ultra')).toBe('ultra');
  });

  test('clampShadowMapSize clamps values correctly', () => {
    expect(clampShadowMapSize(100)).toBe(256);
    expect(clampShadowMapSize(500)).toBe(500);
    expect(clampShadowMapSize(3000)).toBe(2048);
    expect(clampShadowMapSize(1024)).toBe(1024);
  });

  test('getDeviceMaxDpr handles window existing', () => {
    // jsdom provides window
    vi.stubGlobal('window', { devicePixelRatio: 3 });
    expect(getDeviceMaxDpr()).toBe(2);

    vi.stubGlobal('window', { devicePixelRatio: 1.5 });
    expect(getDeviceMaxDpr()).toBe(1.5);

    vi.stubGlobal('window', { devicePixelRatio: 0.5 });
    expect(getDeviceMaxDpr()).toBe(1); // Clamps min to 1
  });

  test('getDeviceMaxDpr handles missing window', () => {
    vi.stubGlobal('window', undefined);

    expect(getDeviceMaxDpr()).toBe(2);
  });
});
