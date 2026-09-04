import React, { act } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HUD } from '../src/components/ui/HUD';
import { useGameStore } from '../src/gameStore';
import * as feedingActions from '../src/game/feedingActions';
import { TANK_CENTER } from '../src/game/feedingActions';

describe('HUD', () => {
  const initialGameState = useGameStore.getState();
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();

    // Avoid noisy warnings and ensure deterministic panel-open behavior.
    window.matchMedia = vi
      .fn()
      .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    act(() => {
      useGameStore.setState(
        {
          ...initialGameState,
          lastFedTime: null,
          isPlacingDecoration: false,
          selectedDecorationType: 'seaweed',
          pendingEffects: [],
          visualQualityOverrides: {},
        },
        true
      );
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();

    window.matchMedia = originalMatchMedia;

    act(() => {
      useGameStore.setState(initialGameState, true);
    });
  });

  it('renders the default callout text', () => {
    const { unmount } = render(<HUD />);

    expect(document.querySelector('.hud-callout')).toHaveTextContent('Click tank to feed fish');

    unmount();
  });

  it('renders the placement callout text when placing decoration', () => {
    act(() => {
      useGameStore.setState({
        isPlacingDecoration: true,
        selectedDecorationType: 'seaweed',
      });
    });

    const { unmount } = render(<HUD />);

    expect(document.querySelector('.hud-callout')).toHaveTextContent(
      'Click tank floor to place • Esc to cancel'
    );

    unmount();
  });

  it('toggles panel visibility and aria-expanded when clicking handle', () => {
    render(<HUD />);

    const collapseButton = screen.getByRole('button', { name: 'Collapse HUD' });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('.hud-callout')).toHaveTextContent('Click tank to feed fish');

    fireEvent.click(collapseButton);

    const expandButton = screen.getByRole('button', { name: 'Expand HUD' });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(document.querySelector('.hud-callout')).not.toBeInTheDocument();
  });

  it('feeds at tank center from the rail and F shortcut, but not while typing', () => {
    const feedSpy = vi.spyOn(feedingActions, 'feedAt').mockImplementation(() => {});
    render(<HUD onOpenSettings={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Feed fish' }));
    fireEvent.keyDown(window, { key: 'f' });
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'f' });

    expect(feedSpy).toHaveBeenCalledTimes(2);
    expect(feedSpy).toHaveBeenNthCalledWith(1, TANK_CENTER);
    expect(feedSpy).toHaveBeenNthCalledWith(2, TANK_CENTER);
    input.remove();
  });

  it('disables global shortcuts while Settings is open', () => {
    const feedSpy = vi.spyOn(feedingActions, 'feedAt').mockImplementation(() => {});
    render(<HUD shortcutsDisabled />);

    fireEvent.keyDown(window, { key: 'f' });
    fireEvent.keyDown(window, { key: '1' });

    expect(feedSpy).not.toHaveBeenCalled();
    expect(useGameStore.getState().isPlacingDecoration).toBe(false);
  });
});
