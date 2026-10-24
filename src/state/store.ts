import { create } from 'zustand';
import { loadCare, saveCare, wipeGlass } from '../sim/care';
import type { CareState, CareStorage } from '../sim/care';

export type ClockMode = 'live' | 'cycle' | 'manual';
export type Viewpoint = 'sofa' | 'tank' | 'glass' | 'room' | 'follow';
/** High, High without depth of field ("medium"), and Lite (no post-processing). */
export type Quality = 'high' | 'medium' | 'low';
/**
 * Why the room is not showing: no WebGL, the fish failed or took too long to load, the GPU
 * dropped the context, or something inside the canvas crashed.
 */
export type LoadError = 'webgl' | 'assets' | 'timeout' | 'context-lost' | 'crash';
/**
 * Why High quality fell back to Lite: the post stack did not download but may next time,
 * cannot be retried without a reload, was replaced by a newer deploy, or crashed after loading.
 */
export type EffectsNotice = 'retry' | 'reload' | 'update' | 'crash';

/** These notices mean another High attempt cannot succeed on this page. */
export const effectsBlocked = (notice: EffectsNotice | null) =>
  notice === 'reload' || notice === 'update';

/**
 * How long a switch to High, or the post stack appearing, is shielded from the performance
 * monitor. Covers the chunk download, shader compiles and the first few frames after them.
 */
export const QUALITY_GRACE_MS = 5000;

/** Cheapest first, so a step down is one index lower. */
const QUALITY_LEVELS: readonly Quality[] = ['low', 'medium', 'high'];

/**
 * How long the monitor must wait after its first step down before it may step back up. Each
 * further step down since the last manual choice doubles the wait, so a device that keeps
 * slowing down again settles instead of flipping between levels.
 */
export const QUALITY_RECOVER_MS = 15000;

/** After this many steps down since the last manual choice, the monitor stops stepping up. */
export const QUALITY_MAX_DROPS = 4;

/** The part of the store the performance monitor steps through. */
export interface QualityAuto {
  /** The level being rendered. */
  quality: Quality;
  /** The level the user chose: the monitor never steps above it. */
  qualityCeiling: Quality;
  /** `performance.now()` before which the monitor is ignored. */
  qualityGraceUntil: number;
  /** Steps down since the last manual choice. */
  qualityDrops: number;
  /** `performance.now()` before which the monitor may not step up. */
  qualityRecoverAt: number;
}

/**
 * One performance-monitor step, `down` on a frame-rate decline and `up` on an incline. Returns
 * the changed fields, or null when the step is refused: inside a grace period, already at the
 * bottom or at the user's choice, too soon after a step down, or after too many of them.
 */
export const stepQuality = (
  state: QualityAuto,
  direction: 'down' | 'up',
  now: number
): Partial<QualityAuto> | null => {
  if (now < state.qualityGraceUntil) return null;
  const level = QUALITY_LEVELS.indexOf(state.quality);
  if (direction === 'down') {
    if (level === 0) return null;
    return {
      quality: QUALITY_LEVELS[level - 1],
      qualityGraceUntil: now + QUALITY_GRACE_MS,
      qualityDrops: state.qualityDrops + 1,
      qualityRecoverAt: now + QUALITY_RECOVER_MS * 2 ** state.qualityDrops,
    };
  }
  if (
    level >= QUALITY_LEVELS.indexOf(state.qualityCeiling) ||
    state.qualityDrops >= QUALITY_MAX_DROPS ||
    now < state.qualityRecoverAt
  ) {
    return null;
  }
  return { quality: QUALITY_LEVELS[level + 1], qualityGraceUntil: now + QUALITY_GRACE_MS };
};

interface AquariumState extends QualityAuto {
  clockMode: ClockMode;
  /** Hour shown in manual mode (0..24). */
  manualHour: number;
  /** Hour currently rendered, published by the scene a few times per second. */
  displayHour: number;
  viewpoint: Viewpoint;
  /** Ambient mode: the camera moves through the shots on its own. */
  ambient: boolean;
  /** Shows "Switched to Lite for performance" until dismissed or quality is chosen again. */
  qualityNotice: boolean;
  sound: boolean;
  /** Incremented to ask the scene to sprinkle food at a random spot. */
  feedRequest: number;
  /** Incremented to ask the scene to tap the front glass (the fish startle). */
  tapRequest: number;
  /** Saved care state: algae, plant and fish growth, fish names. */
  care: CareState;
  /** Wall-clock time the care state is shown at, refreshed every minute or so. */
  careNow: number;
  /** School index of the fish the follow cam is on, or null outside Follow mode. */
  followedFish: number | null;
  /** School index of the fish under the pointer in Follow mode, or null. */
  hoveredFish: number | null;
  fishCount: number;
  ready: boolean;
  loadError: LoadError | null;
  /** Bumped by Retry so the scene remounts the fish loader. */
  loadAttempt: number;
  effectsNotice: EffectsNotice | null;
  setClockMode: (mode: ClockMode) => void;
  setManualHour: (hour: number) => void;
  setDisplayHour: (hour: number) => void;
  setViewpoint: (viewpoint: Viewpoint) => void;
  setAmbient: (ambient: boolean) => void;
  /** A choice made by the user (or the app on their behalf); restarts the grace period. */
  setQuality: (quality: Quality) => void;
  /** Starts a fresh grace period, e.g. once the post stack has mounted. */
  holdQuality: () => void;
  /** The frame rate declined: one level down, through `stepQuality`. */
  autoDowngrade: () => void;
  /** The frame rate recovered: one level back up towards the user's choice, if `stepQuality` allows. */
  autoUpgrade: () => void;
  dismissQualityNotice: () => void;
  toggleSound: () => void;
  requestFeed: () => void;
  requestTap: () => void;
  /** Moves the care clock on to `now`. */
  tickCare: (now: number) => void;
  /** Wipes the algae off the glass and saves it. */
  wipeGlass: () => void;
  setFollowedFish: (index: number | null) => void;
  setHoveredFish: (index: number | null) => void;
  setFishCount: (count: number) => void;
  setReady: () => void;
  setLoadError: (error: LoadError | null) => void;
  retryLoad: () => void;
  setEffectsNotice: (notice: EffectsNotice | null) => void;
}

/**
 * `?quality=lite` starts without post-processing (handy on weak GPUs and in CI), and
 * `?quality=medium` without depth of field.
 */
const initialQuality = (): Quality => {
  if (typeof window === 'undefined') return 'high';
  const flag = new URLSearchParams(window.location.search).get('quality');
  return flag === 'lite' ? 'low' : flag === 'medium' ? 'medium' : 'high';
};

/** `?ambient` starts in ambient mode, for a screen that is left running. */
const initialAmbient = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('ambient');

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

/** `localStorage`, or null where there is none or it is blocked. */
const careStorage = (): CareStorage | null => {
  try {
    return typeof window !== 'undefined' ? (window.localStorage ?? null) : null;
  } catch {
    return null;
  }
};

const startedAt = Date.now();

const graceFromNow = () => performance.now() + QUALITY_GRACE_MS;

const startQuality = initialQuality();

export const useAquarium = create<AquariumState>((set) => ({
  clockMode: 'live',
  manualHour: 14,
  displayHour: 12,
  viewpoint: 'sofa',
  ambient: initialAmbient(),
  quality: startQuality,
  qualityCeiling: startQuality,
  qualityGraceUntil: graceFromNow(),
  qualityDrops: 0,
  qualityRecoverAt: 0,
  qualityNotice: false,
  sound: false,
  feedRequest: 0,
  tapRequest: 0,
  care: loadCare(careStorage(), startedAt, Math.floor(Math.random() * 2 ** 32)),
  careNow: startedAt,
  followedFish: null,
  hoveredFish: null,
  fishCount: 0,
  ready: false,
  loadError: detectWebGL() ? null : 'webgl',
  loadAttempt: 0,
  effectsNotice: null,
  setClockMode: (clockMode) =>
    set((state) => ({
      clockMode,
      // Entering manual mode keeps the current time instead of jumping.
      manualHour: clockMode === 'manual' ? state.displayHour : state.manualHour,
    })),
  setManualHour: (manualHour) => set({ manualHour, clockMode: 'manual' }),
  setDisplayHour: (displayHour) => set({ displayHour }),
  setViewpoint: (viewpoint) => set({ viewpoint }),
  setAmbient: (ambient) => set({ ambient }),
  // High would only fail again once the post stack is known to be unreachable.
  setQuality: (quality) =>
    set((state) =>
      quality !== 'low' && effectsBlocked(state.effectsNotice)
        ? {}
        : {
            quality,
            qualityCeiling: quality,
            qualityGraceUntil: graceFromNow(),
            qualityDrops: 0,
            qualityRecoverAt: 0,
            qualityNotice: false,
          }
    ),
  holdQuality: () =>
    set((state) => ({ qualityGraceUntil: Math.max(state.qualityGraceUntil, graceFromNow()) })),
  // Only reaching Lite is announced; dropping depth of field alone is a quiet change.
  autoDowngrade: () =>
    set((state) => {
      const step = stepQuality(state, 'down', performance.now());
      return step ? { ...step, qualityNotice: step.quality === 'low' || state.qualityNotice } : {};
    }),
  // Leaving Lite takes the notice away with it. A post-stack failure sets the choice to Lite,
  // so the monitor never climbs back into a broken post stack.
  autoUpgrade: () =>
    set((state) => {
      const step = stepQuality(state, 'up', performance.now());
      return step ? { ...step, qualityNotice: false } : {};
    }),
  dismissQualityNotice: () => set({ qualityNotice: false }),
  toggleSound: () => set((state) => ({ sound: !state.sound })),
  requestFeed: () => set((state) => ({ feedRequest: state.feedRequest + 1 })),
  requestTap: () => set((state) => ({ tapRequest: state.tapRequest + 1 })),
  tickCare: (careNow) => set({ careNow }),
  wipeGlass: () =>
    set((state) => {
      const careNow = Date.now();
      const care = wipeGlass(state.care, careNow);
      saveCare(careStorage(), care);
      return { care, careNow };
    }),
  setFollowedFish: (followedFish) => set({ followedFish }),
  setHoveredFish: (hoveredFish) => set({ hoveredFish }),
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
  // A blocking notice stays: only a reload clears it.
  setEffectsNotice: (effectsNotice) =>
    set((state) =>
      effectsBlocked(state.effectsNotice) && effectsNotice !== 'update' ? {} : { effectsNotice }
    ),
}));

export const formatHour = (hour: number) => {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
