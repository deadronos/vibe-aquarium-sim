import { createContext, useContext } from 'react';
import type { VisualQualityFlags } from './qualityPresets';

export interface VisualQualityContextValue extends VisualQualityFlags {
  isWebGPU: boolean;
}

export const VisualQualityContext = createContext<VisualQualityContextValue | undefined>(undefined);

export const useVisualQuality = (): VisualQualityContextValue => {
  const value = useContext(VisualQualityContext);
  if (value === undefined) {
    throw new Error('useVisualQuality must be used within a VisualQualityProvider');
  }
  return value;
};
