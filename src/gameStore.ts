import { create } from 'zustand';
import type { VisualQualityFlags } from './performance/qualityPresets';

export type DecorationType = 'seaweed' | 'coral' | 'rock';

interface GameState {
  // Feeding
  lastFedTime: Date | null;

  // Decoration placement
  isPlacingDecoration: boolean;
  selectedDecorationType: DecorationType;

  // Effects queue (for spawning effects from systems)
  pendingEffects: Array<{
    type: 'ripple' | 'eating_burst';
    position: { x: number; y: number; z: number };
    id: string;
  }>;

  // Visual overrides (optional; defaults to presets)
  visualQualityOverrides: Partial<VisualQualityFlags>;

  // Actions
  setLastFedTime: (time: Date) => void;
  startPlacingDecoration: (type: DecorationType) => void;
  stopPlacingDecoration: () => void;
  addEffect: (effect: GameState['pendingEffects'][0]) => void;
  removeEffect: (id: string) => void;

  setVisualQualityOverrides: (overrides: Partial<VisualQualityFlags>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  lastFedTime: null,
  isPlacingDecoration: false,
  selectedDecorationType: 'seaweed',
  pendingEffects: [],
  visualQualityOverrides: {},

  setLastFedTime: (time) => set({ lastFedTime: time }),

  startPlacingDecoration: (type) =>
    set({
      isPlacingDecoration: true,
      selectedDecorationType: type,
    }),

  stopPlacingDecoration: () => set({ isPlacingDecoration: false }),

  addEffect: (effect) =>
    set((state) => ({
      pendingEffects: [...state.pendingEffects, effect],
    })),

  removeEffect: (id) =>
    set((state) => ({
      pendingEffects: state.pendingEffects.filter((e) => e.id !== id),
    })),

  setVisualQualityOverrides: (overrides) =>
    set((state) => ({
      visualQualityOverrides: {
        ...state.visualQualityOverrides,
        ...overrides,
      },
    })),
}));
