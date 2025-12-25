import { create } from 'zustand';
import type { QualityLevel, QualitySettings } from './qualityPresets';
import { getDeviceMaxDpr, getQualitySettings } from './qualityPresets';

interface QualityState {
  isAdaptiveEnabled: boolean;
  level: QualityLevel;
  settings: QualitySettings;
  fpsEma: number;

  setAdaptiveEnabled: (enabled: boolean) => void;
  setLevel: (level: QualityLevel) => void;
  setFpsEma: (fpsEma: number) => void;
  applyLevelWithDeviceClamp: (level: QualityLevel) => void;
}

const deviceMaxDpr = getDeviceMaxDpr();
const initialLevel: QualityLevel = deviceMaxDpr <= 1 ? 'medium' : 'high';

export const useQualityStore = create<QualityState>((set) => ({
  isAdaptiveEnabled: true,
  level: initialLevel,
  settings: getQualitySettings(initialLevel, deviceMaxDpr),
  fpsEma: 60,

  setAdaptiveEnabled: (enabled) => set({ isAdaptiveEnabled: enabled }),

  setLevel: (level) =>
    set({
      level,
      settings: getQualitySettings(level, getDeviceMaxDpr()),
    }),

  applyLevelWithDeviceClamp: (level) =>
    set({
      level,
      settings: getQualitySettings(level, getDeviceMaxDpr()),
    }),

  setFpsEma: (fpsEma) => set({ fpsEma }),
}));
