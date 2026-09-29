import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useGameStore } from '../gameStore';
import { useQualityStore } from './qualityStore';
import { getQualityProfile } from './qualityProfile';
import { toRendererBackend } from '../utils/rendererPolicy';
import { VisualQualityContext, type VisualQualityContextValue } from './VisualQualityContext';

export const VisualQualityProvider = ({
  children,
  isWebGPU = false,
  softwareWebGPU = false,
}: {
  children: ReactNode;
  isWebGPU?: boolean;
  softwareWebGPU?: boolean;
}) => {
  const settings = useQualityStore((s) => s.settings);

  const overrides = useGameStore((s) => s.visualQualityOverrides ?? {});

  const value = useMemo<VisualQualityContextValue>(() => {
    const qualityProfile = getQualityProfile(
      settings.level,
      toRendererBackend(isWebGPU),
      undefined,
      softwareWebGPU
    );
    const optionalOverride = (value: boolean, override: boolean | undefined) =>
      softwareWebGPU ? false : (override ?? value);
    const mergedProfile = {
      ...qualityProfile,
      causticsEnabled: optionalOverride(qualityProfile.causticsEnabled, overrides.causticsEnabled),
      fishRimLightingEnabled: optionalOverride(
        qualityProfile.fishRimLightingEnabled,
        overrides.fishRimLightingEnabled
      ),
      fishSubsurfaceScatteringEnabled: optionalOverride(
        qualityProfile.fishSubsurfaceScatteringEnabled,
        overrides.fishSubsurfaceScatteringEnabled
      ),
      waterSurfaceUpgradeEnabled: optionalOverride(
        qualityProfile.waterSurfaceUpgradeEnabled,
        overrides.waterSurfaceUpgradeEnabled
      ),
      waterVolumeUpgradeEnabled: optionalOverride(
        qualityProfile.waterVolumeUpgradeEnabled,
        overrides.waterVolumeUpgradeEnabled
      ),
      ambientParticlesEnabled: optionalOverride(
        qualityProfile.ambientParticlesEnabled,
        overrides.ambientParticlesEnabled
      ),
      depthOfFieldEnabled: optionalOverride(
        qualityProfile.depthOfFieldEnabled,
        overrides.depthOfFieldEnabled
      ),
      adaptiveInstanceUpdatesEnabled:
        overrides.adaptiveInstanceUpdatesEnabled ?? qualityProfile.adaptiveInstanceUpdatesEnabled,
      adaptiveSchedulerEnabled:
        overrides.adaptiveSchedulerEnabled ?? qualityProfile.adaptiveSchedulerEnabled,
    };

    return {
      ...mergedProfile,
      isWebGPU,
      softwareWebGPU,
      qualityProfile: mergedProfile,
    };
  }, [
    isWebGPU,
    softwareWebGPU,
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
