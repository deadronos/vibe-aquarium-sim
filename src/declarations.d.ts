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

  type VibeDebugCollector = {
    simulateStep: VibeSimEntry[];
    fishRender: VibeRenderEntry[];
    fishUseFrame: VibeFishUseFrameEntry[];
    scheduler?: VibeSchedEntry[];
    schedulerTuning?: VibeSchedulerTuningEntry[];
    reset?: () => void;
    download?: () => boolean;
  };

  interface Window {
    __vibe_addFish?: (n: number) => number;
    __vibe_poc_enabled?: boolean;
    __vibe_debug?: VibeDebugCollector;
    __vibe_renderStatus?: VibeRenderStatus;
    __vibe_schedStatus?: VibeSchedStatus;
    toggleBoidsWorker?: () => void;
  }
}
