import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useGameStore } from '../gameStore';
import { useQualityStore } from './qualityStore';
import { getQualityProfile } from './qualityProfile';
import { VisualQualityContext, type VisualQualityContextValue } from './VisualQualityContext';

export const VisualQualityProvider = ({
  children,
  isWebGPU = false,
}: {
  children: ReactNode;
  isWebGPU?: boolean;
}) => {
  const settings = useQualityStore((s) => s.settings);

  const overrides = useGameStore((s) => s.visualQualityOverrides ?? {});

  const value = useMemo<VisualQualityContextValue>(() => {
    const qualityProfile = getQualityProfile(settings.level, isWebGPU ? 'webgpu' : 'webgl');
    const mergedProfile = {
      ...qualityProfile,
      causticsEnabled: overrides.causticsEnabled ?? qualityProfile.causticsEnabled,
      fishRimLightingEnabled:
        overrides.fishRimLightingEnabled ?? qualityProfile.fishRimLightingEnabled,
      fishSubsurfaceScatteringEnabled:
        overrides.fishSubsurfaceScatteringEnabled ?? qualityProfile.fishSubsurfaceScatteringEnabled,
      waterSurfaceUpgradeEnabled:
        overrides.waterSurfaceUpgradeEnabled ?? qualityProfile.waterSurfaceUpgradeEnabled,
      waterVolumeUpgradeEnabled:
        overrides.waterVolumeUpgradeEnabled ?? qualityProfile.waterVolumeUpgradeEnabled,
      ambientParticlesEnabled:
        overrides.ambientParticlesEnabled ?? qualityProfile.ambientParticlesEnabled,
      depthOfFieldEnabled: overrides.depthOfFieldEnabled ?? qualityProfile.depthOfFieldEnabled,
      adaptiveInstanceUpdatesEnabled:
        overrides.adaptiveInstanceUpdatesEnabled ?? qualityProfile.adaptiveInstanceUpdatesEnabled,
      adaptiveSchedulerEnabled:
        overrides.adaptiveSchedulerEnabled ?? qualityProfile.adaptiveSchedulerEnabled,
    };

    return {
      ...mergedProfile,
      isWebGPU,
      qualityProfile: mergedProfile,
    };
  }, [
    isWebGPU,
    settings.level,
    overrides.ambientParticlesEnabled,
    overrides.causticsEnabled,
    overrides.depthOfFieldEnabled,
    overrides.fishRimLightingEnabled,
    overrides.fishSubsurfaceScatteringEnabled,
    overrides.waterSurfaceUpgradeEnabled,
    overrides.waterVolumeUpgradeEnabled,
    overrides.adaptiveInstanceUpdatesEnabled,
    overrides.adaptiveSchedulerEnabled,
  ]);

  return <VisualQualityContext.Provider value={value}>{children}</VisualQualityContext.Provider>;
};
