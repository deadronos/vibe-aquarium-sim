import { createContext, useContext } from 'react';
import type { VisualQualityFlags } from './qualityPresets';
import type { QualityProfile } from './qualityProfile';

export interface VisualQualityContextValue extends VisualQualityFlags {
  isWebGPU: boolean;
  spotLightShadowsEnabled: boolean;
  tankTransmissionEnabled: boolean;
  tankTransmissionDispersionEnabled: boolean;
  qualityProfile: QualityProfile;
}

export const VisualQualityContext = createContext<VisualQualityContextValue | undefined>(undefined);

export const useVisualQuality = (): VisualQualityContextValue => {
  const value = useContext(VisualQualityContext);
  if (value === undefined) {
    throw new Error('useVisualQuality must be used within a VisualQualityProvider');
  }
  return value;
};
