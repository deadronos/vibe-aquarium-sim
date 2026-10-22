import { create } from 'zustand';

export type ClockMode = 'live' | 'cycle' | 'manual';
export type Viewpoint = 'sofa' | 'tank' | 'glass' | 'room' | 'follow';
export type Quality = 'high' | 'low';

interface AquariumState {
  clockMode: ClockMode;
  /** Hour shown in manual mode (0..24). */
  manualHour: number;
  /** Hour currently rendered, published by the scene a few times per second. */
  displayHour: number;
  viewpoint: Viewpoint;
  quality: Quality;
  sound: boolean;
  /** Incremented to ask the scene to sprinkle food at a random spot. */
  feedRequest: number;
  fishCount: number;
  ready: boolean;
  setClockMode: (mode: ClockMode) => void;
  setManualHour: (hour: number) => void;
  setDisplayHour: (hour: number) => void;
  setViewpoint: (viewpoint: Viewpoint) => void;
  setQuality: (quality: Quality) => void;
  toggleSound: () => void;
  requestFeed: () => void;
  setFishCount: (count: number) => void;
  setReady: () => void;
}

/** `?quality=lite` starts without post-processing (handy on weak GPUs and in CI). */
const initialQuality = (): Quality =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('quality') === 'lite'
    ? 'low'
    : 'high';

export const useAquarium = create<AquariumState>((set) => ({
  clockMode: 'live',
  manualHour: 14,
  displayHour: 12,
  viewpoint: 'sofa',
  quality: initialQuality(),
  sound: false,
  feedRequest: 0,
  fishCount: 0,
  ready: false,
  setClockMode: (clockMode) =>
    set((state) => ({
      clockMode,
      // Entering manual mode keeps the current time instead of jumping.
      manualHour: clockMode === 'manual' ? state.displayHour : state.manualHour,
    })),
  setManualHour: (manualHour) => set({ manualHour, clockMode: 'manual' }),
  setDisplayHour: (displayHour) => set({ displayHour }),
  setViewpoint: (viewpoint) => set({ viewpoint }),
  setQuality: (quality) => set({ quality }),
  toggleSound: () => set((state) => ({ sound: !state.sound })),
  requestFeed: () => set((state) => ({ feedRequest: state.feedRequest + 1 })),
  setFishCount: (fishCount) => set({ fishCount }),
  setReady: () => set({ ready: true }),
}));

export const formatHour = (hour: number) => {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
