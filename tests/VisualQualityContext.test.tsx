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
      <div data-testid="adaptiveInstance">
        {String(flags.adaptiveInstanceUpdatesEnabled ?? false)}
      </div>
      <div data-testid="adaptiveSched">{String(flags.adaptiveSchedulerEnabled ?? false)}</div>
      <div data-testid="profileBackend">{flags.qualityProfile.backend}</div>
      <div data-testid="profileShadow">{flags.qualityProfile.shadowMapSize}</div>
      <div data-testid="transmission">{String(flags.qualityProfile.tankTransmissionEnabled)}</div>
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

    expect(screen.getByTestId('caustics')).toHaveTextContent('false');
    expect(screen.getByTestId('fishRim')).toHaveTextContent('false');
    expect(screen.getByTestId('dof')).toHaveTextContent('false');
    // defaults for PoC adaptive flags
    expect(screen.getByTestId('adaptiveInstance')).toHaveTextContent('false');
    expect(screen.getByTestId('adaptiveSched')).toHaveTextContent('false');
  });

  it('exposes backend-aware profile values', () => {
    act(() => {
      useQualityStore.setState({ level: 'low', settings: getQualitySettings('low', 2) });
    });

    const webgl = render(
      <VisualQualityProvider isWebGPU={false}>
        <VisualQualityReader />
      </VisualQualityProvider>
    );
    expect(screen.getByTestId('profileBackend')).toHaveTextContent('webgl');
    expect(screen.getByTestId('profileShadow')).toHaveTextContent('512');
    expect(screen.getByTestId('transmission')).toHaveTextContent('false');
    webgl.unmount();

    const webgpu = render(
      <VisualQualityProvider isWebGPU>
        <VisualQualityReader />
      </VisualQualityProvider>
    );
    expect(screen.getByTestId('profileBackend')).toHaveTextContent('webgpu');
    expect(screen.getByTestId('profileShadow')).toHaveTextContent('256');
    expect(screen.getByTestId('transmission')).toHaveTextContent('false');
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

    const first = render(
      <VisualQualityProvider>
        <VisualQualityReader />
      </VisualQualityProvider>
    );

    expect(screen.getByTestId('caustics')).toHaveTextContent('false');
    expect(screen.getByTestId('fishRim')).toHaveTextContent('false');
    expect(screen.getByTestId('dof')).toHaveTextContent('true');
    // overrides should also affect adaptive flags
    act(() => {
      useGameStore.setState({
        visualQualityOverrides: {
          adaptiveInstanceUpdatesEnabled: true,
          adaptiveSchedulerEnabled: true,
        },
      });
    });
    // cleanup previous render to avoid duplicated nodes
    first.unmount();
    render(
      <VisualQualityProvider>
        <VisualQualityReader />
      </VisualQualityProvider>
    );
    expect(screen.getByTestId('adaptiveInstance')).toHaveTextContent('true');
    expect(screen.getByTestId('adaptiveSched')).toHaveTextContent('true');
  });

  it('throws when used outside VisualQualityProvider', () => {
    expect(() => render(<VisualQualityReader />)).toThrow(/useVisualQuality/i);
  });
});
