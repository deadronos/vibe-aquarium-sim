import { type RendererBackend } from '../utils/rendererPolicy';
import {
  clampShadowMapSize,
  getDeviceMaxDpr,
  getQualitySettings,
  type QualityLevel,
  type QualitySettings,
} from './qualityPresets';

export type { RendererBackend } from '../utils/rendererPolicy';

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
  deviceMaxDpr = getDeviceMaxDpr(),
  softwareWebGPU = false
): QualityProfile => {
  const settings = getQualitySettings(level, deviceMaxDpr);
  const isLow = level === 'low';
  const softwareLimited = backend === 'webgpu' && softwareWebGPU;
  const optionalEffectsEnabled = !isLow && !softwareLimited;

  return {
    ...settings,
    dpr: softwareLimited ? Math.min(settings.dpr, 1) : settings.dpr,
    backend,
    causticsEnabled: optionalEffectsEnabled,
    fishRimLightingEnabled: optionalEffectsEnabled,
    fishSubsurfaceScatteringEnabled: optionalEffectsEnabled,
    waterSurfaceUpgradeEnabled: settings.waterSurfaceUpgradeEnabled && optionalEffectsEnabled,
    waterVolumeUpgradeEnabled: settings.waterVolumeUpgradeEnabled && optionalEffectsEnabled,
    ambientParticlesEnabled: settings.ambientParticlesEnabled && optionalEffectsEnabled,
    depthOfFieldEnabled: settings.depthOfFieldEnabled && optionalEffectsEnabled,
    spotLightShadowsEnabled: optionalEffectsEnabled,
    // The tank is a four-pane shell. Thin tinted transparency keeps fish
    // silhouettes stable across WebGL, native WebGPU, and software WebGPU;
    // transmission on the merged shell produces pane-scale refraction artifacts.
    tankTransmissionEnabled: false,
    tankTransmissionDispersionEnabled: false,
    shadowMapSize: clampShadowMapSize(
      backend === 'webgpu'
        ? softwareLimited
          ? WEBGPU_SHADOW_MAP_SIZES.low
          : WEBGPU_SHADOW_MAP_SIZES[level]
        : settings.shadowMapSize
    ),
  };
};
