import { HUD } from './components/ui/HUD';
import DebugHUD from './components/DebugHUD';
import React, { Suspense, useCallback, useEffect, useState } from 'react';

import './App.css';

const SimulationScene = React.lazy(() => import('./SimulationScene'));

function App() {
  const [started, setStarted] = useState(false);

  const start = useCallback(() => {
    setStarted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startIdle = () => {
      if (cancelled) return;

      // Give the browser a moment to paint the shell UI first.
      const w = window as unknown as {
        requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      };

      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(() => {
          if (!cancelled) setStarted(true);
        }, { timeout: 500 });
      } else {
        setTimeout(() => {
          if (!cancelled) setStarted(true);
        }, 0);
      }
    };

    if (document.readyState === 'complete') {
      startIdle();
    } else {
      window.addEventListener('load', startIdle);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', startIdle);
    };
  }, []);

  const loadingOverlay = (
    <div className="vibe-start-overlay">
      <div className="vibe-start-card">
        <div className="vibe-start-title">Vibe Aquarium</div>
        <div className="vibe-start-subtitle">Loading simulation…</div>
      </div>
    </div>
  );

  return (
    <>
      {/* HUD overlay outside Canvas */}
      <HUD />
      <DebugHUD />

      {started ? (
        <Suspense fallback={loadingOverlay}>
          <SimulationScene />
        </Suspense>
      ) : (
        <div className="vibe-start-overlay">
          <div className="vibe-start-card">
            <div className="vibe-start-title">Vibe Aquarium</div>
            <div className="vibe-start-subtitle">
              Starting simulation…
            </div>
            <button className="vibe-start-button" onClick={start} type="button">
              Start Now
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
