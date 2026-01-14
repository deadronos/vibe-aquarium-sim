import '@testing-library/jest-dom/vitest';

// Enable React's act() testing environment flag so tests that trigger state updates
// during effects or render are properly wrapped and do not emit warnings.
// See: https://react.dev/reference/react-dom/test-utils#act
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - global test environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Silently ignore a noisy, benign Three.js warning that is emitted when multiple
// modules resolve `three` via slightly different paths during test bundling.
// This is a targeted suppression for the exact message only.
const _origConsoleError = console.error;
const _origConsoleWarn = console.warn;
console.error = (...args: unknown[]) => {
  try {
    const msg = String(args[0] ?? '');
    if (msg === 'THREE.WARNING: Multiple instances of Three.js being imported.') return;
  } catch {
    /* ignore */
  }
  return (_origConsoleError as (...a: unknown[]) => void).apply(console, args);
};
console.warn = (...args: unknown[]) => {
  try {
    const msg = String(args[0] ?? '');
    if (msg === 'THREE.WARNING: Multiple instances of Three.js being imported.') return;
  } catch {
    /* ignore */
  }
  return (_origConsoleWarn as (...a: unknown[]) => void).apply(console, args);
};



import { act } from 'react';
import { useQualityStore } from '../src/performance/qualityStore';
import { useGameStore } from '../src/gameStore';

