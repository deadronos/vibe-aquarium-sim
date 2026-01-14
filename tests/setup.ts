import '@testing-library/jest-dom/vitest';

// Enable React's act() testing environment flag so tests that trigger state updates
// during effects or render are properly wrapped and do not emit warnings.
// See: https://react.dev/reference/react-dom/test-utils#act
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - global test environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Suppress noisy but non-actionable THREE.js warnings in tests (e.g., multiple
// Three copies imported via dev/test module resolution). Keep other console
// output intact.
const _consoleError = console.error;
console.error = (...args: unknown[]) => {
  try {
    const msg = String(args[0] ?? '');
    if (msg.includes('THREE.WARNING: Multiple instances of Three.js being imported')) return;
  } catch {
    // ignore
  }
  type ConsoleFn = (...a: unknown[]) => void;
  return (_consoleError as ConsoleFn).call(console, ...args);
};

const _consoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  try {
    const msg = String(args[0] ?? '');
    if (msg.includes('THREE.WARNING: Multiple instances of Three.js being imported')) return;
  } catch {
    // ignore
  }
  type ConsoleFn = (...a: unknown[]) => void;
  return (_consoleWarn as ConsoleFn).call(console, ...args);
};

// Wrap common Zustand stores' setState to call React's act automatically in tests
// to avoid the 'not wrapped in act(...)' warning when tests mutate stores.
import { act } from 'react';
import { useQualityStore } from '../src/performance/qualityStore';
import { useGameStore } from '../src/gameStore';

function wrapSetState(store: { setState: (...args: unknown[]) => void }) {
  const orig = store.setState.bind(store) as (...args: unknown[]) => void;
  store.setState = ((...args: unknown[]) => {
    // Wrap sync state updates in act so React does not warn during tests.
    act(() => {
      orig(...args);
    });
  }) as typeof store.setState;
}

wrapSetState(useQualityStore);
wrapSetState(useGameStore);

