// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAquarium } from '../src/state/store';
import { Hud } from '../src/ui/Hud';

describe('HUD accessibility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    act(() => {
      useAquarium.setState({
        ready: true,
        loadError: null,
        clockMode: 'live',
        viewpoint: 'sofa',
        feedRequest: 0,
      });
    });
  });

  afterEach(() => vi.useRealTimers());

  it('removes hidden controls from focus and exposes a recovery button', () => {
    render(<Hud />);
    const navigation = screen.getByRole('navigation', { name: 'Aquarium controls' });
    const care = screen.getByRole('group', { name: 'Tank care' });
    screen.getByRole('radio', { name: 'Sofa' }).focus();

    fireEvent.keyDown(window, { key: 'h' });

    expect(navigation.hasAttribute('inert')).toBe(true);
    expect(navigation.getAttribute('aria-hidden')).toBe('true');
    expect(care.parentElement?.hasAttribute('inert')).toBe(true);
    const reveal = screen.getByRole('button', { name: 'Show controls (H)' });
    fireEvent.click(reveal);

    expect(navigation.hasAttribute('inert')).toBe(false);
    expect(navigation.hasAttribute('aria-hidden')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Show controls (H)' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Sofa' }));
  });

  it('offers a visible wake control instead of intercepting taps on an inert idle bar', () => {
    render(<Hud />);
    const navigation = screen.getByRole('navigation', { name: 'Aquarium controls' });

    act(() => vi.advanceTimersByTime(7001));

    expect(navigation.hasAttribute('inert')).toBe(true);
    const wake = screen.getByRole('button', { name: 'Show controls' });
    fireEvent.click(wake);
    expect(navigation.hasAttribute('inert')).toBe(false);
  });

  it('moves and selects radio options with arrow keys', () => {
    render(<Hud />);
    const sofa = screen.getByRole('radio', { name: 'Sofa' });
    sofa.focus();

    fireEvent.keyDown(sofa, { key: 'ArrowRight' });

    const tank = screen.getByRole('radio', { name: 'Tank' });
    expect(tank.getAttribute('aria-checked')).toBe('true');
    expect(tank.tabIndex).toBe(0);
    expect(sofa.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(tank);

    const live = screen.getByRole('radio', { name: 'Live' });
    live.focus();
    fireEvent.keyDown(live, { key: 'ArrowDown' });
    const cycle = screen.getByRole('radio', { name: 'Day cycle' });
    expect(cycle.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(cycle);
  });

  it('announces feeding without re-rendering the whole HUD', () => {
    const { container } = render(<Hud />);
    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(screen.getByText('Food added to the tank.')).toBeTruthy();
    const live = container.querySelector('.hud__sr-only')!;
    const firstMessage = live.firstChild;
    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(live.firstChild).not.toBe(firstMessage);
  });

  it('disables feeding while the scene is unavailable', () => {
    act(() => useAquarium.setState({ ready: false }));
    render(<Hud />);
    expect((screen.getByRole('button', { name: 'Feed' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps a radio tab stop and matching value text in manual clock mode', () => {
    act(() => {
      useAquarium.setState({ clockMode: 'manual', manualHour: 18.5, displayHour: 12 });
    });
    render(<Hud />);

    expect((screen.getByRole('radio', { name: 'Live' }) as HTMLButtonElement).tabIndex).toBe(0);
    expect(screen.getByRole('slider', { name: 'Time of day' }).getAttribute('aria-valuetext')).toBe(
      '18:30, Evening'
    );
  });
});
