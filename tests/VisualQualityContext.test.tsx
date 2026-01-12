import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { useVisualQuality } from '../src/performance/VisualQualityContext';
import { useGameStore } from '../src/gameStore';
import { getQualitySettings } from '../src/performance/qualityPresets';
import { useQualityStore } from '../src/performance/qualityStore';

const VisualQualityReader = () => {
  const flags = useVisualQuality();
  return (
    <>
      <div data-testid="caustics">{String(flags.causticsEnabled)}</div>
      <div data-testid="fishRim">{String(flags.fishRimLightingEnabled)}</div>
      <div data-testid="dof">{String(flags.depthOfFieldEnabled)}</div>
    </>
  );
};

describe('useVisualQuality', () => {
  const initialQualityState = useQualityStore.getState();
  const initialGameState = useGameStore.getState();

  afterEach(() => {
    act(() => {
      useQualityStore.setState(initialQualityState, true);
      useGameStore.setState(initialGameState, true);
    });
  });

  it('works under VisualQualityProvider', () => {
    act(() => {
      useQualityStore.setState({
        settings: {
          ...getQualitySettings('high', 2),
          causticsEnabled: false,
        },
      });

      useGameStore.setState({
        visualQualityOverrides: {
          causticsEnabled: true,
        },
      });
    });

    render(
      <VisualQualityProvider>
        <VisualQualityReader />
      </VisualQualityProvider>
    );

    expect(screen.getByTestId('caustics')).toHaveTextContent('true');
  });

  it('uses store/preset values when overrides are empty', () => {
    act(() => {
      useQualityStore.setState({
        settings: getQualitySettings('low', 2),
      });

      useGameStore.setState({
        visualQualityOverrides: {},
      });
    });

    render(
      <VisualQualityProvider>
        <VisualQualityReader />
      </VisualQualityProvider>
    );

    expect(screen.getByTestId('caustics')).toHaveTextContent('true');
    expect(screen.getByTestId('fishRim')).toHaveTextContent('true');
    expect(screen.getByTestId('dof')).toHaveTextContent('false');
  });

  it('prefers per-flag overrides over store values', () => {
    act(() => {
      useQualityStore.setState({
        settings: {
          ...getQualitySettings('high', 2),
          causticsEnabled: true,
          fishRimLightingEnabled: true,
          depthOfFieldEnabled: false,
        },
      });

      useGameStore.setState({
        visualQualityOverrides: {
          causticsEnabled: false,
          fishRimLightingEnabled: false,
          depthOfFieldEnabled: true,
        },
      });
    });

    render(
      <VisualQualityProvider>
        <VisualQualityReader />
      </VisualQualityProvider>
    );

    expect(screen.getByTestId('caustics')).toHaveTextContent('false');
    expect(screen.getByTestId('fishRim')).toHaveTextContent('false');
    expect(screen.getByTestId('dof')).toHaveTextContent('true');
  });

  it('throws when used outside VisualQualityProvider', () => {
    expect(() => render(<VisualQualityReader />)).toThrow(/useVisualQuality/i);
  });
});
