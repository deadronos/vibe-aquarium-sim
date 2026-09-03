import React, { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettingsModal } from '../src/components/ui/SettingsModal';

describe('SettingsModal', () => {
  it('focuses the close button, traps Tab, restores the opener, and closes on Escape', () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open settings';
    document.body.appendChild(opener);
    opener.focus();

    const returnFocusRef = createRef<HTMLButtonElement>();
    returnFocusRef.current = opener;
    const onClose = vi.fn();
    const { rerender } = render(
      <SettingsModal
        open
        onClose={onClose}
        showDebugPanel={false}
        setShowDebugPanel={vi.fn()}
        returnFocusRef={returnFocusRef}
      />
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    const checkbox = screen.getByRole('checkbox', { name: 'Show debug panel' });

    act(() => {
      closeButton.focus();
    });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: 'Tab' });
    expect(checkbox).toHaveFocus();

    fireEvent.keyDown(checkbox, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(closeButton, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <SettingsModal
        open={false}
        onClose={onClose}
        showDebugPanel={false}
        setShowDebugPanel={vi.fn()}
        returnFocusRef={returnFocusRef}
      />
    );
    expect(opener).toHaveFocus();

    opener.remove();
  });

  it('marks the application shell inert while open', () => {
    const shell = document.createElement('div');
    const shellRef = createRef<HTMLDivElement>();
    shellRef.current = shell;
    document.body.appendChild(shell);

    const { rerender } = render(
      <SettingsModal
        open
        onClose={vi.fn()}
        showDebugPanel={false}
        setShowDebugPanel={vi.fn()}
        backgroundRef={shellRef}
      />
    );

    expect((shell as HTMLDivElement & { inert?: boolean }).inert).toBe(true);

    rerender(
      <SettingsModal
        open={false}
        onClose={vi.fn()}
        showDebugPanel={false}
        setShowDebugPanel={vi.fn()}
        backgroundRef={shellRef}
      />
    );
    expect((shell as HTMLDivElement & { inert?: boolean }).inert).toBe(false);
    shell.remove();
  });
});
