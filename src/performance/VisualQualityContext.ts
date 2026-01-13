import { createContext, useContext } from 'react';
import type { VisualQualityFlags } from './qualityPresets';

export const VisualQualityContext = createContext<VisualQualityFlags | undefined>(undefined);

export const useVisualQuality = (): VisualQualityFlags => {
  const value = useContext(VisualQualityContext);
  if (value === undefined) {
    throw new Error('useVisualQuality must be used within a VisualQualityProvider');
  }
  return value;
};
