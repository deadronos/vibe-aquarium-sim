import { describe, expect, it } from 'vitest';
import { getQualityProfile } from '../src/performance/qualityProfile';

describe('getQualityProfile', () => {
  it('disables optional GPU costs at low quality on both backends', () => {
    for (const backend of ['webgl', 'webgpu'] as const) {
      const profile = getQualityProfile('low', backend);

      expect(profile).toMatchObject({
        level: 'low',
        causticsEnabled: false,
        fishRimLightingEnabled: false,
        fishSubsurfaceScatteringEnabled: false,
        spotLightShadowsEnabled: false,
        tankTransmissionEnabled: false,
        tankTransmissionDispersionEnabled: false,
      });
    }
  });

  it('retains optional effects for medium and higher WebGPU tiers', () => {
    for (const level of ['medium', 'high', 'ultra'] as const) {
      const profile = getQualityProfile(level, 'webgpu');

      expect(profile.causticsEnabled).toBe(true);
      expect(profile.fishRimLightingEnabled).toBe(true);
      expect(profile.fishSubsurfaceScatteringEnabled).toBe(true);
      expect(profile.spotLightShadowsEnabled).toBe(true);
      expect(profile.tankTransmissionEnabled).toBe(true);
      expect(profile.tankTransmissionDispersionEnabled).toBe(true);
    }
  });

  it('keeps WebGL preset shadow sizes and uses smaller WebGPU values', () => {
    expect(getQualityProfile('low', 'webgl').shadowMapSize).toBe(512);
    expect(getQualityProfile('medium', 'webgl').shadowMapSize).toBe(768);
    expect(getQualityProfile('high', 'webgl').shadowMapSize).toBe(1024);
    expect(getQualityProfile('ultra', 'webgl').shadowMapSize).toBe(1536);

    expect(getQualityProfile('low', 'webgpu').shadowMapSize).toBe(256);
    expect(getQualityProfile('medium', 'webgpu').shadowMapSize).toBe(512);
    expect(getQualityProfile('high', 'webgpu').shadowMapSize).toBe(768);
    expect(getQualityProfile('ultra', 'webgpu').shadowMapSize).toBe(1024);
  });

  it('does not mutate shared preset values', () => {
    const profile = getQualityProfile('low', 'webgpu');
    profile.shadowMapSize = 2048;

    expect(getQualityProfile('low', 'webgl').shadowMapSize).toBe(512);
  });
});
