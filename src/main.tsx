import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { world } from './store';
import { Vector3 } from 'three';
import './index.css';

// Debug helper: add N fish at runtime to stress test performance
// Usage: window.__vibe_addFish(100)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__vibe_addFish = (n: number) => {
    let added = 0;
    for (let i = 0; i < n; i++) {
      world.add({
        isFish: true,
        isBoid: true,
        position: new Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4),
        velocity: new Vector3((Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1),
        steeringForce: new Vector3(),
        externalForce: new Vector3(),
        targetVelocity: new Vector3(),
        excitementLevel: 0,
        excitementDecay: 0,
      });
      added++;
    }
    return added;
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
