import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useGameStore } from '../gameStore';
import { useQualityStore } from './qualityStore';
import type { VisualQualityFlags } from './qualityPresets';
import { VisualQualityContext } from './VisualQualityContext';

export const VisualQualityProvider = ({ children }: { children: ReactNode }) => {
  const causticsEnabled = useQualityStore((s) => s.settings.causticsEnabled);
  const fishRimLightingEnabled = useQualityStore((s) => s.settings.fishRimLightingEnabled);
  const fishSubsurfaceScatteringEnabled = useQualityStore(
    (s) => s.settings.fishSubsurfaceScatteringEnabled
  );
  const waterSurfaceUpgradeEnabled = useQualityStore((s) => s.settings.waterSurfaceUpgradeEnabled);
  const waterVolumeUpgradeEnabled = useQualityStore((s) => s.settings.waterVolumeUpgradeEnabled);
  const ambientParticlesEnabled = useQualityStore((s) => s.settings.ambientParticlesEnabled);
  const depthOfFieldEnabled = useQualityStore((s) => s.settings.depthOfFieldEnabled);

  const overrides = useGameStore((s) => s.visualQualityOverrides ?? {});

  const adaptiveInstanceUpdatesEnabled = useQualityStore((s) => s.settings.adaptiveInstanceUpdatesEnabled);
  const adaptiveSchedulerEnabled = useQualityStore((s) => s.settings.adaptiveSchedulerEnabled);

  const value = useMemo<VisualQualityFlags>(
    () => ({
      causticsEnabled: overrides.causticsEnabled ?? causticsEnabled,
      fishRimLightingEnabled: overrides.fishRimLightingEnabled ?? fishRimLightingEnabled,
      fishSubsurfaceScatteringEnabled:
        overrides.fishSubsurfaceScatteringEnabled ?? fishSubsurfaceScatteringEnabled,
      waterSurfaceUpgradeEnabled:
        overrides.waterSurfaceUpgradeEnabled ?? waterSurfaceUpgradeEnabled,
      waterVolumeUpgradeEnabled: overrides.waterVolumeUpgradeEnabled ?? waterVolumeUpgradeEnabled,
      ambientParticlesEnabled: overrides.ambientParticlesEnabled ?? ambientParticlesEnabled,
      depthOfFieldEnabled: overrides.depthOfFieldEnabled ?? depthOfFieldEnabled,
      // New adaptive flags
      adaptiveInstanceUpdatesEnabled:
        overrides.adaptiveInstanceUpdatesEnabled ?? adaptiveInstanceUpdatesEnabled,
      adaptiveSchedulerEnabled: overrides.adaptiveSchedulerEnabled ?? adaptiveSchedulerEnabled,
    }),
    [
      ambientParticlesEnabled,
      causticsEnabled,
      depthOfFieldEnabled,
      fishRimLightingEnabled,
      fishSubsurfaceScatteringEnabled,
      overrides.ambientParticlesEnabled,
      overrides.causticsEnabled,
      overrides.depthOfFieldEnabled,
      overrides.fishRimLightingEnabled,
      overrides.fishSubsurfaceScatteringEnabled,
      overrides.waterSurfaceUpgradeEnabled,
      overrides.waterVolumeUpgradeEnabled,
      overrides.adaptiveInstanceUpdatesEnabled,
      overrides.adaptiveSchedulerEnabled,
      waterSurfaceUpgradeEnabled,
      waterVolumeUpgradeEnabled,
      adaptiveInstanceUpdatesEnabled,
      adaptiveSchedulerEnabled,
    ]
  );

  return <VisualQualityContext.Provider value={value}>{children}</VisualQualityContext.Provider>;
};
