import { create } from 'zustand';
import type { QualityLevel, QualitySettings } from './qualityPresets';
import { getDeviceMaxDpr, getQualitySettings } from './qualityPresets';

interface QualityState {
  isAdaptiveEnabled: boolean;
  level: QualityLevel;
  settings: QualitySettings;
  fpsEma: number;
  instanceUpdateBudget: number;

  setAdaptiveEnabled: (enabled: boolean) => void;
  setLevel: (level: QualityLevel) => void;
  setFpsEma: (fpsEma: number) => void;
  applyLevelWithDeviceClamp: (level: QualityLevel) => void;
  setInstanceUpdateBudget: (budget: number) => void;
}

const deviceMaxDpr = getDeviceMaxDpr();
const initialLevel: QualityLevel = deviceMaxDpr <= 1 ? 'medium' : 'high';

export const useQualityStore = create<QualityState>((set) => ({
  isAdaptiveEnabled: true,
  level: initialLevel,
  settings: getQualitySettings(initialLevel, deviceMaxDpr),
  fpsEma: 60,
  instanceUpdateBudget: getQualitySettings(initialLevel, deviceMaxDpr).instanceUpdateBudget,

  setAdaptiveEnabled: (enabled) => set({ isAdaptiveEnabled: enabled }),

  setLevel: (level) =>
    set({
      level,
      settings: getQualitySettings(level, getDeviceMaxDpr()),
      instanceUpdateBudget: getQualitySettings(level, getDeviceMaxDpr()).instanceUpdateBudget,
    }),

  applyLevelWithDeviceClamp: (level) =>
    set({
      level,
      settings: getQualitySettings(level, getDeviceMaxDpr()),
      instanceUpdateBudget: getQualitySettings(level, getDeviceMaxDpr()).instanceUpdateBudget,
    }),

  setFpsEma: (fpsEma) => set({ fpsEma }),

  setInstanceUpdateBudget: (budget: number) => set({ instanceUpdateBudget: Math.max(8, Math.min(4096, Math.round(budget))) }),
}));
