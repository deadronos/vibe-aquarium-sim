import { create } from 'zustand';

export type ClockMode = 'live' | 'cycle' | 'manual';
export type Viewpoint = 'sofa' | 'tank' | 'glass' | 'room' | 'follow';
export type Quality = 'high' | 'low';
/**
 * Why the room is not showing: no WebGL, the fish failed or took too long to load, the GPU
 * dropped the context, or something inside the canvas crashed.
 */
export type LoadError = 'webgl' | 'assets' | 'timeout' | 'context-lost' | 'crash';

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
  loadError: LoadError | null;
  /** Bumped by Retry so the scene remounts the fish loader. */
  loadAttempt: number;
  setClockMode: (mode: ClockMode) => void;
  setManualHour: (hour: number) => void;
  setDisplayHour: (hour: number) => void;
  setViewpoint: (viewpoint: Viewpoint) => void;
  setQuality: (quality: Quality) => void;
  toggleSound: () => void;
  requestFeed: () => void;
  setFishCount: (count: number) => void;
  setReady: () => void;
  setLoadError: (error: LoadError | null) => void;
  retryLoad: () => void;
}

/** `?quality=lite` starts without post-processing (handy on weak GPUs and in CI). */
const initialQuality = (): Quality =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('quality') === 'lite'
    ? 'low'
    : 'high';

/** Probes for WebGL once at startup; outside a browser (unit tests) it is assumed present. */
const detectWebGL = () => {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    // Hand the probe context back so it does not count against the browser's context limit.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
};

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
  loadError: detectWebGL() ? null : 'webgl',
  loadAttempt: 0,
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
  // Fish that arrive after a timeout still lift the veil.
  setReady: () =>
    set((state) => ({
      ready: true,
      loadError: state.loadError === 'timeout' ? null : state.loadError,
    })),
  // Missing WebGL is permanent for this page, so nothing overrides it.
  setLoadError: (loadError) => set((state) => (state.loadError === 'webgl' ? {} : { loadError })),
  retryLoad: () =>
    set((state) => ({
      loadError: state.loadError === 'webgl' ? 'webgl' : null,
      loadAttempt: state.loadAttempt + 1,
    })),
}));

export const formatHour = (hour: number) => {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
