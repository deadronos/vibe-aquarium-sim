import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MobileActionRail } from '../src/components/ui/MobileActionRail';

describe('MobileActionRail', () => {
  it('exposes immediate primary actions and decoration state', () => {
    const onFeed = vi.fn();
    const onToggleDecor = vi.fn();
    render(
      <MobileActionRail
        onFeed={onFeed}
        onToggleDecor={onToggleDecor}
        onOpenSettings={vi.fn()}
        isPlacingDecoration={false}
        fishCount={30}
        placementHint="Click tank to feed fish"
      />
    );

    expect(
      screen.getByRole('navigation', { name: 'Primary aquarium actions' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Feed fish' }));
    fireEvent.click(screen.getByRole('button', { name: 'Place decoration' }));
    expect(onFeed).toHaveBeenCalledOnce();
    expect(onToggleDecor).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Place decoration' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
