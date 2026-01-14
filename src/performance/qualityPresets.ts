export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  level: QualityLevel;
  dpr: number;
  tankTransmissionResolution: number;
  tankTransmissionSamples: number;
  shadowMapSize: number;
  effectParticleMultiplier: number;
  causticsEnabled: boolean;
  fishRimLightingEnabled: boolean;
  fishSubsurfaceScatteringEnabled: boolean;
  waterSurfaceUpgradeEnabled: boolean;
  waterVolumeUpgradeEnabled: boolean;
  ambientParticlesEnabled: boolean;
  depthOfFieldEnabled: boolean;
  // New adaptive flags (PoC opt-in)
  adaptiveInstanceUpdatesEnabled: boolean;
  adaptiveSchedulerEnabled: boolean;
}

type EnabledBooleanKey<T> = {
  [K in keyof T]-?: K extends `${string}Enabled` ? (T[K] extends boolean ? K : never) : never;
}[keyof T];

export type VisualQualityFlags = Pick<QualitySettings, EnabledBooleanKey<QualitySettings>>;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const getDeviceMaxDpr = (): number => {
  if (typeof window === 'undefined') return 2;
  const device = typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1;
  return clamp(device, 1, 2);
};

export const QUALITY_PRESETS: Record<QualityLevel, Omit<QualitySettings, 'dpr'>> = {
  low: {
    level: 'low',
    tankTransmissionResolution: 512,
    tankTransmissionSamples: 2,
    shadowMapSize: 512,
    effectParticleMultiplier: 0.5,
    causticsEnabled: true,
    fishRimLightingEnabled: true,
    fishSubsurfaceScatteringEnabled: true,
    waterSurfaceUpgradeEnabled: false,
    waterVolumeUpgradeEnabled: false,
    ambientParticlesEnabled: false,
    depthOfFieldEnabled: false,
    adaptiveInstanceUpdatesEnabled: false,
    adaptiveSchedulerEnabled: false,
  },
  medium: {
    level: 'medium',
    tankTransmissionResolution: 768,
    tankTransmissionSamples: 4,
    shadowMapSize: 768,
    effectParticleMultiplier: 0.75,
    causticsEnabled: true,
    fishRimLightingEnabled: true,
    fishSubsurfaceScatteringEnabled: true,
    waterSurfaceUpgradeEnabled: true,
    waterVolumeUpgradeEnabled: true,
    ambientParticlesEnabled: true,
    depthOfFieldEnabled: false,
    adaptiveInstanceUpdatesEnabled: false,
    adaptiveSchedulerEnabled: false,
  },
  high: {
    level: 'high',
    tankTransmissionResolution: 1024,
    tankTransmissionSamples: 6,
    shadowMapSize: 1024,
    effectParticleMultiplier: 1,
    causticsEnabled: true,
    fishRimLightingEnabled: true,
    fishSubsurfaceScatteringEnabled: true,
    waterSurfaceUpgradeEnabled: true,
    waterVolumeUpgradeEnabled: true,
    ambientParticlesEnabled: true,
    depthOfFieldEnabled: false,
    adaptiveInstanceUpdatesEnabled: false,
    adaptiveSchedulerEnabled: false,
  },
  ultra: {
    level: 'ultra',
    tankTransmissionResolution: 1536,
    tankTransmissionSamples: 8,
    shadowMapSize: 1536,
    effectParticleMultiplier: 1.25,
    causticsEnabled: true,
    fishRimLightingEnabled: true,
    fishSubsurfaceScatteringEnabled: true,
    waterSurfaceUpgradeEnabled: true,
    waterVolumeUpgradeEnabled: true,
    ambientParticlesEnabled: true,
    depthOfFieldEnabled: true,
    adaptiveInstanceUpdatesEnabled: false,
    adaptiveSchedulerEnabled: false,
  },
};

export const getPresetDpr = (level: QualityLevel, deviceMaxDpr: number): number => {
  const dprByLevel: Record<QualityLevel, number> = {
    low: 0.75,
    medium: 1,
    high: 1.25,
    ultra: 1.5,
  };

  return clamp(dprByLevel[level], 0.5, deviceMaxDpr);
};

export const getQualitySettings = (level: QualityLevel, deviceMaxDpr: number): QualitySettings => {
  const preset = QUALITY_PRESETS[level];
  return {
    ...preset,
    dpr: getPresetDpr(level, deviceMaxDpr),
    adaptiveInstanceUpdatesEnabled: preset.adaptiveInstanceUpdatesEnabled ?? false,
    adaptiveSchedulerEnabled: preset.adaptiveSchedulerEnabled ?? false,
  } as QualitySettings;
};

export const clampShadowMapSize = (size: number): number => {
  // Keep power-of-two-ish sizes; Three allows any, but this is conventional.
  // We also clamp to reasonable bounds to avoid huge allocations.
  return clamp(Math.round(size), 256, 2048);
};

export const nextLowerQuality = (level: QualityLevel): QualityLevel => {
  if (level === 'ultra') return 'high';
  if (level === 'high') return 'medium';
  return 'low';
};

export const nextHigherQuality = (level: QualityLevel): QualityLevel => {
  if (level === 'low') return 'medium';
  if (level === 'medium') return 'high';
  return 'ultra';
};
