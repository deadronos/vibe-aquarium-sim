import React, { useEffect, useState } from 'react';
import { useQualityStore } from '../performance/qualityStore';

import './DebugHUD.css';

type RenderStatus = { ema: number; updateFreq?: number; activeEntities?: number; frameDuration?: number } | null;
type SchedStatus = { ema: number; currentMax?: number; lastDuration?: number } | null;
type Counts = { simulate: number; render: number; fishUse: number; scheduler: number } | null;

declare global {
  interface SimEntry { duration: number; time?: number; fishCount?: number }
  interface RenderEntry { frame?: number; duration: number; counts?: { countA:number; countB:number; countC:number }; activeEntities?: number; updateFreq?: number; ema?: number; flushed?: number }
  interface SchedEntry { duration: number; subSteps?: number; time?: number; ema?: number }
  interface SchedulerTuningEntry { time: number; action: 'reduce' | 'restore'; from?: number; to: number }

  interface Window {
    __vibe_renderStatus?: RenderStatus;
    __vibe_schedStatus?: SchedStatus;
    __vibe_debug?: { simulateStep: SimEntry[]; fishRender: RenderEntry[]; fishUseFrame: Array<{duration:number; modelIndex:number|null}>; scheduler?: SchedEntry[]; schedulerTuning?: SchedulerTuningEntry[]; reset?: () => void; download?: () => boolean };
    __vibe_addFish?: (n: number) => number;
  }
}

export const DebugHUD: React.FC = () => {
  const [renderStatus, setRenderStatus] = useState<RenderStatus>(null);
  const [schedStatus, setSchedStatus] = useState<SchedStatus>(null);
  const [counts, setCounts] = useState<Counts>(null);

  useEffect(() => {
    let mounted = true;
    const id = setInterval(() => {
      try {
        const rs = window.__vibe_renderStatus || null;
        const ss = window.__vibe_schedStatus || null;
        const dbg = window.__vibe_debug || null;
        const c = dbg
          ? {
              simulate: dbg.simulateStep.length,
              render: dbg.fishRender.length,
              fishUse: dbg.fishUseFrame.length,
              scheduler: (dbg.scheduler || []).length,
            }
          : null;
        if (!mounted) return;
        setRenderStatus(rs);
        setSchedStatus(ss);
        setCounts(c);
      } catch (err) {
        // swallow - non-critical
        console.debug('DebugHUD sampling error', err);
      }
    }, 500);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const addFish = (n: number) => {
    try {
      const added = window.__vibe_addFish && window.__vibe_addFish(n);
      // force an update of debug counts immediately
      try {
        const dbg = window.__vibe_debug;
        setCounts(dbg ? { simulate: dbg.simulateStep.length, render: dbg.fishRender.length, fishUse: dbg.fishUseFrame.length, scheduler: (dbg.scheduler||[]).length } : null);
      } catch (err) {
        // ignore
        console.debug('DebugHUD immediate count refresh failed', err);
      }
      return added;
    } catch (err) {

      console.debug('DebugHUD addFish failed', err);
      return null;
    }
  };

  const downloadDebug = () => {
    try {
      const dbg = window.__vibe_debug;
      if (dbg && dbg.download) dbg.download();
    } catch (err) {
      console.debug('DebugHUD download failed', err);
    }
  };

  return (
    <div className="vibe-debug-hud">
      <div className="title">Debug HUD</div>

      <div className="line">Render: {renderStatus ? `EMA ${renderStatus.ema.toFixed(2)}ms • freq ${renderStatus.updateFreq}` : '—'}</div>
      <div className="line">Scheduler: {schedStatus ? `EMA ${schedStatus.ema.toFixed(2)}ms • max ${schedStatus.currentMax}` : '—'}</div>
      <div className="line">Counts: {counts ? `fishRender ${counts.render} • simulate ${counts.simulate} • scheduler ${counts.scheduler}` : '—'}</div>

      <div className="controls">
        <button onClick={() => addFish(100)}>+100 fish</button>
        <button onClick={() => addFish(300)}>+300 fish</button>
        <button onClick={downloadDebug}>Download trace</button>
      </div>

      <div className="toggles">
        <label>
          <input
            type="checkbox"
            checked={!!useQualityStore.getState().settings.adaptiveInstanceUpdatesEnabled}
            onChange={() => {
              const cur = useQualityStore.getState();
              useQualityStore.setState({ settings: { ...cur.settings, adaptiveInstanceUpdatesEnabled: !cur.settings.adaptiveInstanceUpdatesEnabled } });
            }}
          />
          Adaptive Instance Updates
        </label>

        <label className="right">
          <input
            type="checkbox"
            checked={!!useQualityStore.getState().settings.adaptiveSchedulerEnabled}
            onChange={() => {
              const cur = useQualityStore.getState();
              useQualityStore.setState({ settings: { ...cur.settings, adaptiveSchedulerEnabled: !cur.settings.adaptiveSchedulerEnabled } });
            }}
          />
          Adaptive Scheduler
        </label>

        <div className="budget">
          <label>
            Instance budget:
            <input
              type="number"
              defaultValue={useQualityStore.getState().instanceUpdateBudget}
              min={8}
              max={4096}
              step={8}
              onBlur={(e) => {
                const v = Number(e.currentTarget.value) || 128;
                useQualityStore.getState().setInstanceUpdateBudget(v);
              }}
            />
          </label>
        </div>
      </div>

      <div className="note">Note: PoC HUD — temporary for profiling. ✅</div>
    </div>
  );
};

export default DebugHUD;
