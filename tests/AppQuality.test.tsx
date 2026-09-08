import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../src/App';
import { useQualityStore } from '../src/performance/qualityStore';

// Keep this initialization test independent of GPU/physics loading.
vi.mock('../src/SimulationScene', () => ({ default: () => null }));
vi.mock('../src/components/ui/HUD', () => ({ HUD: () => null }));

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  useQualityStore.setState(useQualityStore.getInitialState());
});

it('locks an explicit quality query for reproducible visual comparisons', () => {
  window.history.replaceState({}, '', '/?quality=ultra');
  render(<App />);
  expect(useQualityStore.getState().level).toBe('ultra');
  expect(useQualityStore.getState().isAdaptiveEnabled).toBe(false);
});

it('keeps automatic quality enabled for normal visits', () => {
  render(<App />);
  expect(useQualityStore.getState().isAdaptiveEnabled).toBe(true);
});
