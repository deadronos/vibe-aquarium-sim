import type { RendererBackend } from './utils/rendererPolicy';

declare module '*.glb' {
  const src: string;
  export default src;
}

export type VibeRenderStatus = {
  ema: number;
  updateFreq?: number;
  activeEntities?: number;
  frameDuration?: number;
} | null;

export type VibeSchedStatus = {
  ema: number;
  fixedStepHz?: number;
  lastDuration?: number;
} | null;

export type VibeRendererStatus = {
  requested: RendererBackend;
  selected: RendererBackend;
  fallback: boolean;
};

export type VibeSimEntry = { duration: number; time: number; fishCount: number };
export type VibeRenderEntry = {
  frame: number;
  duration: number;
  counts: { countA: number; countB: number; countC: number };
  activeEntities: number;
  ema?: number;
  flushed?: number;
};
export type VibeFishUseFrameEntry = { duration: number; modelIndex: number | null };
export type VibeSchedEntry = {
  duration: number;
  subSteps?: number;
  time?: number;
  ema?: number;
};
export type VibeSchedulerTuningEntry = {
  time: number;
  action: 'reduce' | 'restore';
  from?: number;
  to: number;
};
export type VibeQualityTransitionEntry = {
  from: 'low' | 'medium' | 'high' | 'ultra';
  to: 'low' | 'medium' | 'high' | 'ultra';
  backend: RendererBackend;
  ema: number;
  reason: 'low-fps' | 'high-fps' | 'device-clamp';
  time: number;
};
export type VibeTransportMode = 'shared' | 'transfer' | 'copy' | 'main-thread';
export type VibeTransportStatus = {
  mode: VibeTransportMode;
  isolationSupported: boolean;
  fishCapacity: number;
  foodCapacity: number;
  submitted: number;
  completed: number;
  errors: number;
  overlapCount: number;
  busy: boolean;
  latestReason: string | null;
};

export type VibeFishAssetLoadState = 'loading' | 'ready' | 'error';
export type VibeFishAssetStatus = {
  primary: VibeFishAssetLoadState;
  variants: [VibeFishAssetLoadState, VibeFishAssetLoadState];
};

export type VibeDebugCollector = {
  simulateStep: VibeSimEntry[];
  fishRender: VibeRenderEntry[];
  fishUseFrame: VibeFishUseFrameEntry[];
  scheduler?: VibeSchedEntry[];
  schedulerTuning?: VibeSchedulerTuningEntry[];
  qualityTransitions?: VibeQualityTransitionEntry[];
  transport?: VibeTransportStatus | null;
  reset?: () => void;
  download?: () => boolean;
};

declare global {
  type VibeRenderStatus = import('./declarations').VibeRenderStatus;
  type VibeSchedStatus = import('./declarations').VibeSchedStatus;
  type VibeRendererStatus = import('./declarations').VibeRendererStatus;
  type VibeSimEntry = import('./declarations').VibeSimEntry;
  type VibeRenderEntry = import('./declarations').VibeRenderEntry;
  type VibeFishUseFrameEntry = import('./declarations').VibeFishUseFrameEntry;
  type VibeSchedEntry = import('./declarations').VibeSchedEntry;
  type VibeSchedulerTuningEntry = import('./declarations').VibeSchedulerTuningEntry;
  type VibeQualityTransitionEntry = import('./declarations').VibeQualityTransitionEntry;
  type VibeTransportMode = import('./declarations').VibeTransportMode;
  type VibeTransportStatus = import('./declarations').VibeTransportStatus;
  type VibeFishAssetLoadState = import('./declarations').VibeFishAssetLoadState;
  type VibeFishAssetStatus = import('./declarations').VibeFishAssetStatus;
  type VibeDebugCollector = import('./declarations').VibeDebugCollector;

  interface Window {
    __vibe_addFish?: (n: number) => number;
    __vibe_poc_enabled?: boolean;
    __vibe_test?: import('./utils/testHarness').VibeTestHarness;
    __vibe_debug?: VibeDebugCollector;
    __vibe_renderStatus?: VibeRenderStatus;
    __vibe_schedStatus?: VibeSchedStatus;
    __vibe_rendererStatus?: VibeRendererStatus;
    __vibe_qualityStatus?: {
      backend: RendererBackend;
      softwareWebGPU?: boolean;
      level: 'low' | 'medium' | 'high' | 'ultra';
      shadowMapSize: number;
      causticsEnabled: boolean;
      fishRimLightingEnabled: boolean;
      fishSubsurfaceScatteringEnabled: boolean;
      spotLightShadowsEnabled: boolean;
      tankTransmissionEnabled: boolean;
      tankTransmissionDispersionEnabled: boolean;
      stressMode?: boolean;
      fishCount?: number;
    };
    __vibe_transportStatus?: VibeTransportStatus;
    __vibe_fishAssetStatus?: VibeFishAssetStatus;
    toggleBoidsWorker?: () => void;
  }
}
