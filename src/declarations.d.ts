declare module '*.glb' {
  const src: string;
  export default src;
}

export {};

declare global {
  type VibeRenderStatus = {
    ema: number;
    updateFreq?: number;
    activeEntities?: number;
    frameDuration?: number;
  } | null;

  type VibeSchedStatus = {
    ema: number;
    currentMax?: number;
    lastDuration?: number;
  } | null;

  type VibeRendererStatus = {
    requested: 'webgl' | 'webgpu';
    selected: 'webgl' | 'webgpu';
    fallback: boolean;
  };

  type VibeSimEntry = { duration: number; time: number; fishCount: number };
  type VibeRenderEntry = {
    frame: number;
    duration: number;
    counts: { countA: number; countB: number; countC: number };
    activeEntities: number;
    ema?: number;
    flushed?: number;
  };
  type VibeFishUseFrameEntry = { duration: number; modelIndex: number | null };
  type VibeSchedEntry = {
    duration: number;
    subSteps?: number;
    time?: number;
    ema?: number;
  };
  type VibeSchedulerTuningEntry = {
    time: number;
    action: 'reduce' | 'restore';
    from?: number;
    to: number;
  };
  type VibeQualityTransitionEntry = {
    from: 'low' | 'medium' | 'high' | 'ultra';
    to: 'low' | 'medium' | 'high' | 'ultra';
    backend: 'webgl' | 'webgpu';
    ema: number;
    reason: 'low-fps' | 'high-fps' | 'device-clamp';
    time: number;
  };
  type VibeTransportMode = 'shared' | 'transfer' | 'copy' | 'main-thread';
  type VibeTransportStatus = {
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

  type VibeDebugCollector = {
    simulateStep: VibeSimEntry[];
    fishRender: VibeRenderEntry[];
    fishUseFrame: VibeFishUseFrameEntry[];
    scheduler?: VibeSchedEntry[];
    schedulerTuning?: VibeSchedulerTuningEntry[];
    qualityTransitions?: VibeQualityTransitionEntry[];
    reset?: () => void;
    download?: () => boolean;
  };

  interface Window {
    __vibe_addFish?: (n: number) => number;
    __vibe_poc_enabled?: boolean;
    __vibe_debug?: VibeDebugCollector;
    __vibe_renderStatus?: VibeRenderStatus;
    __vibe_schedStatus?: VibeSchedStatus;
    __vibe_rendererStatus?: VibeRendererStatus;
    __vibe_qualityStatus?: {
      backend: 'webgl' | 'webgpu';
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
    toggleBoidsWorker?: () => void;
  }
}
