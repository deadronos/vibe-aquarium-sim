import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DebugHUD from '../src/components/DebugHUD';
import { ensurePerfDebug } from '../src/utils/perfDebug';

describe('DebugHUD telemetry opt-in', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    delete window.__vibe_debug;
    delete window.__vibe_renderStatus;
    delete window.__vibe_schedStatus;
    delete window.__vibe_transportStatus;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.__vibe_debug;
    delete window.__vibe_renderStatus;
    delete window.__vibe_schedStatus;
    delete window.__vibe_transportStatus;
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

  it('displays the active worker transport mode from the low-frequency sampler', () => {
    const { unmount } = render(<DebugHUD />);

    window.__vibe_transportStatus = {
      mode: 'transfer',
      isolationSupported: false,
      fishCapacity: 16,
      foodCapacity: 8,
      submitted: 4,
      completed: 3,
      errors: 0,
      overlapCount: 0,
      busy: true,
      latestReason: 'worker ready',
    };

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/Transport: transfer • jobs 4\/3 • busy/)).toBeInTheDocument();
    unmount();
  });

  it('keeps the latest transport snapshot when the opt-in collector resets', () => {
    const collector = ensurePerfDebug();
    expect(collector).not.toBeNull();
    if (!collector) return;

    const status: VibeTransportStatus = {
      mode: 'shared',
      isolationSupported: true,
      fishCapacity: 16,
      foodCapacity: 8,
      submitted: 2,
      completed: 2,
      errors: 0,
      overlapCount: 0,
      busy: false,
      latestReason: null,
    };
    collector.transport = status;
    collector.simulateStep.push({ duration: 1, time: 1, fishCount: 2 });

    collector.reset?.();

    expect(collector.simulateStep).toHaveLength(0);
    expect(collector.transport).toBe(status);
  });
});
