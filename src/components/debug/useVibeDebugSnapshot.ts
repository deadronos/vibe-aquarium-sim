import { useCallback, useEffect, useState } from 'react';
import { ensurePerfDebug } from '../../utils/perfDebug';
import type { VibeRenderStatus, VibeSchedStatus } from '../../utils/perfDebug';

export type TransportStatus = VibeTransportStatus | null;
export type DebugCounts = {
  simulate: number;
  render: number;
  fishUse: number;
  scheduler: number;
} | null;

export function readDebugCounts(dbg: VibeDebugCollector | null | undefined): DebugCounts {
  if (!dbg) return null;
  return {
    simulate: dbg.simulateStep.length,
    render: dbg.fishRender.length,
    fishUse: dbg.fishUseFrame.length,
    scheduler: (dbg.scheduler || []).length,
  };
}

export const useVibeDebugSnapshot = () => {
  const [renderStatus, setRenderStatus] = useState<VibeRenderStatus>(null);
  const [schedStatus, setSchedStatus] = useState<VibeSchedStatus>(null);
  const [transportStatus, setTransportStatus] = useState<TransportStatus>(null);
  const [counts, setCounts] = useState<DebugCounts>(null);

  useEffect(() => {
    const hadCollector = Boolean(window.__vibe_debug);
    const collector = ensurePerfDebug();

    return () => {
      // The HUD is the user-facing opt-in. Preserve collectors supplied by a
      // development harness, but remove the one created for this panel.
      if (!hadCollector && window.__vibe_debug === collector) {
        delete window.__vibe_debug;
        delete window.__vibe_renderStatus;
        delete window.__vibe_schedStatus;
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const id = setInterval(() => {
      try {
        const rs = window.__vibe_renderStatus || null;
        const ss = window.__vibe_schedStatus || null;
        const dbg = window.__vibe_debug || null;
        const ts = window.__vibe_transportStatus || dbg?.transport || null;
        const c = readDebugCounts(dbg);
        if (!mounted) return;
        // Systems mutate stable status objects in place to avoid frame-loop
        // allocations; snapshot them here at the HUD's low refresh cadence so
        // React still receives a new value and re-renders the displayed data.
        setRenderStatus(rs ? { ...rs } : null);
        setSchedStatus(ss ? { ...ss } : null);
        setTransportStatus(ts ? { ...ts } : null);
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

  const refreshCounts = useCallback(() => {
    try {
      setCounts(readDebugCounts(window.__vibe_debug));
    } catch (err) {
      // ignore
      console.debug('DebugHUD immediate count refresh failed', err);
    }
  }, []);

  return { renderStatus, schedStatus, transportStatus, counts, refreshCounts };
};
