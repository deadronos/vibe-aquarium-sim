// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const renders = vi.hoisted(() => ({ hud: 0, clock: 0 }));

// `Hud` calls `useReducedMotion` once per render and `Clock` calls `formatHour` once per render;
// neither calls the other's, so they count each component's own renders.
vi.mock('../src/state/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/state/motion')>()),
  useReducedMotion: () => {
    renders.hud++;
    return false;
  },
}));

vi.mock('../src/state/store', async (importOriginal) => {
  const store = await importOriginal<typeof import('../src/state/store')>();
  return {
    ...store,
    formatHour: (hour: number) => {
      renders.clock++;
      return store.formatHour(hour);
    },
  };
});

const { Hud } = await import('../src/ui/Hud');
const { useAquarium } = await import('../src/state/store');

describe('HUD renders', () => {
  beforeEach(() => {
    act(() => {
      useAquarium.setState({ clockMode: 'cycle', displayHour: 8, ready: true, loadError: null });
    });
    render(<Hud />);
    renders.hud = 0;
    renders.clock = 0;
  });

  it('re-renders only the clock while Day cycle moves the hour', () => {
    for (let i = 1; i <= 10; i++) {
      act(() => useAquarium.getState().setDisplayHour(8 + i / 4));
    }
    expect(renders.clock).toBe(10);
    expect(renders.hud).toBe(0);
    expect(screen.getByText('10:30')).toBeTruthy();
  });

  it('re-renders the HUD for the fields it shows', () => {
    act(() => useAquarium.getState().setViewpoint('glass'));
    expect(renders.hud).toBe(1);
  });

  it('ignores store fields the HUD does not show', () => {
    act(() => useAquarium.getState().requestFeed());
    act(() => useAquarium.getState().holdQuality());
    expect(renders.hud).toBe(0);
    expect(renders.clock).toBe(0);
  });
});
