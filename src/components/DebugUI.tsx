import { useState, useEffect } from 'react';
import { debugSettings } from '../debug';

export const DebugUI = () => {
  const [enabled, setEnabled] = useState(debugSettings.fixedStepEnabled);

  useEffect(() => {
    debugSettings.fixedStepEnabled = enabled;
  }, [enabled]);

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      background: 'rgba(0,0,0,0.5)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      pointerEvents: 'auto',
      zIndex: 1000,
      fontFamily: 'monospace'
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>Fixed Step Boids</span>
      </label>
      <div style={{ fontSize: '0.8em', marginTop: '5px', opacity: 0.8 }}>
        {enabled ? 'Logic: Fixed 60Hz' : 'Logic: Frame-tied'}
      </div>
    </div>
  );
};
