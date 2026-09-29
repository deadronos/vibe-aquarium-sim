import React from 'react';
import { useVibeDebugSnapshot } from './debug/useVibeDebugSnapshot';
import { DebugControls } from './debug/DebugControls';

import './DebugHUD.css';

export const DebugHUD: React.FC = () => {
  const { renderStatus, schedStatus, transportStatus, counts, refreshCounts } =
    useVibeDebugSnapshot();

  const addFish = (n: number) => {
    try {
      const added = window.__vibe_addFish && window.__vibe_addFish(n);
      // force an update of debug counts immediately
      refreshCounts();
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

      <div className="line">
        Render:{' '}
        {renderStatus
          ? `EMA ${renderStatus.ema.toFixed(2)}ms • freq ${renderStatus.updateFreq}`
          : '—'}
      </div>
      <div className="line">
        Scheduler:{' '}
        {schedStatus
          ? `EMA ${schedStatus.ema.toFixed(2)}ms • step ${schedStatus.fixedStepHz}Hz`
          : '—'}
      </div>
      <div className="line">
        Counts:{' '}
        {counts
          ? `fishRender ${counts.render} • simulate ${counts.simulate} • scheduler ${counts.scheduler}`
          : '—'}
      </div>
      <div className="line">
        Transport:{' '}
        {transportStatus
          ? `${transportStatus.mode} • jobs ${transportStatus.submitted}/${transportStatus.completed} • ${transportStatus.busy ? 'busy' : 'idle'}`
          : '—'}
      </div>

      <DebugControls onAddFish={addFish} onDownloadTrace={downloadDebug} />

      <div className="note">Note: PoC HUD — temporary for profiling. ✅</div>
    </div>
  );
};

export default DebugHUD;
