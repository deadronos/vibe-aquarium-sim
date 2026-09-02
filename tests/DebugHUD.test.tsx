import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DebugHUD from '../src/components/DebugHUD';

describe('DebugHUD telemetry opt-in', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete window.__vibe_debug;
    delete window.__vibe_renderStatus;
    delete window.__vibe_schedStatus;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__vibe_debug;
    delete window.__vibe_renderStatus;
    delete window.__vibe_schedStatus;
  });

  it('creates the collector while visible and removes it when hidden', () => {
    const { unmount } = render(<DebugHUD />);

    expect(window.__vibe_debug).toBeDefined();
    expect(window.__vibe_debug?.simulateStep).toBeDefined();

    unmount();

    expect(window.__vibe_debug).toBeUndefined();
  });

  it('refreshes displayed values from stable system status objects', () => {
    const { unmount } = render(<DebugHUD />);

    window.__vibe_renderStatus = {
      ema: 1.25,
      updateFreq: 2,
      activeEntities: 4,
      frameDuration: 1.25,
    };
    window.__vibe_schedStatus = { ema: 0.75, currentMax: 5, lastDuration: 0.75 };

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/EMA 1\.25ms • freq 2/)).toBeInTheDocument();
    expect(screen.getByText(/EMA 0\.75ms • max 5/)).toBeInTheDocument();

    unmount();
  });
});
