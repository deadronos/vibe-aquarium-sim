import {
  clampShadowMapSize,
  getDeviceMaxDpr,
  getQualitySettings,
  type QualityLevel,
  type QualitySettings,
} from './qualityPresets';

export type RendererBackend = 'webgl' | 'webgpu';

export interface QualityProfile extends QualitySettings {
  backend: RendererBackend;
  spotLightShadowsEnabled: boolean;
  tankTransmissionEnabled: boolean;
  tankTransmissionDispersionEnabled: boolean;
}

const WEBGPU_SHADOW_MAP_SIZES: Record<QualityLevel, number> = {
  low: 256,
  medium: 512,
  high: 768,
  ultra: 1024,
};

/**
 * Resolve renderer-specific quality costs without mutating the shared preset.
 * The optional effects are intentionally gated by quality rather than by the
 * renderer so a low-tier profile has a predictable cost on either backend.
 */
export const getQualityProfile = (
  level: QualityLevel,
  backend: RendererBackend,
  deviceMaxDpr = getDeviceMaxDpr()
): QualityProfile => {
  const settings = getQualitySettings(level, deviceMaxDpr);
  const isLow = level === 'low';
  const optionalEffectsEnabled = !isLow;

  return {
    ...settings,
    backend,
    causticsEnabled: optionalEffectsEnabled,
    fishRimLightingEnabled: optionalEffectsEnabled,
    fishSubsurfaceScatteringEnabled: optionalEffectsEnabled,
    spotLightShadowsEnabled: optionalEffectsEnabled,
    tankTransmissionEnabled: backend === 'webgpu' && optionalEffectsEnabled,
    tankTransmissionDispersionEnabled: backend === 'webgpu' && optionalEffectsEnabled,
    shadowMapSize: clampShadowMapSize(
      backend === 'webgpu' ? WEBGPU_SHADOW_MAP_SIZES[level] : settings.shadowMapSize
    ),
  };
};
