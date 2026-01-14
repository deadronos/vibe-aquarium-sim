import React, { act } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HUD } from '../src/components/ui/HUD';
import { useGameStore } from '../src/gameStore';

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

    expect(screen.getByText('Click tank to feed fish')).toBeInTheDocument();

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

    expect(screen.getByText('Click tank floor to place • Esc to cancel')).toBeInTheDocument();

    unmount();
  });

  it('toggles panel visibility and aria-expanded when clicking handle', () => {
    render(<HUD />);

    const collapseButton = screen.getByRole('button', { name: 'Collapse HUD' });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Click tank to feed fish')).toBeInTheDocument();

    fireEvent.click(collapseButton);

    const expandButton = screen.getByRole('button', { name: 'Expand HUD' });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Click tank to feed fish')).not.toBeInTheDocument();
  });
});
