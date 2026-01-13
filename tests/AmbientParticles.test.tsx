import { beforeEach, describe, expect, it } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import React from 'react';

import { AmbientParticles } from '../src/components/AmbientParticles';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { useGameStore } from '../src/gameStore';
import { useQualityStore } from '../src/performance/qualityStore';
import { getQualitySettings } from '../src/performance/qualityPresets';

// Mock ResizeObserver which is needed by R3F/Three
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('AmbientParticles', () => {
  beforeEach(() => {
    const qualityState = useQualityStore.getState();
    useQualityStore.setState(
      {
        ...qualityState,
        // Make tests deterministic and order-independent.
        isAdaptiveEnabled: true,
        level: 'low',
        settings: getQualitySettings('low', 2),
        fpsEma: 60,
      },
      true
    );

    const gameState = useGameStore.getState();
    useGameStore.setState(
      {
        ...gameState,
        lastFedTime: null,
        isPlacingDecoration: false,
        selectedDecorationType: 'seaweed',
        pendingEffects: [],
        visualQualityOverrides: {},
      },
      true
    );
  });

  it('renders particles when ambientParticlesEnabled override is true', async () => {
    useGameStore.setState({ visualQualityOverrides: { ambientParticlesEnabled: true } });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <AmbientParticles />
      </VisualQualityProvider>
    );

    try {
      // AmbientParticlesEnabled returns a group containing two Points
      expect(renderer.scene.children.length).toBe(1);

      const group = renderer.scene.children[0];
      expect(group.type).toBe('Group');

      const anyGroup = group as unknown as { children?: Array<{ type: string }> };
      expect(anyGroup.children?.length).toBe(2);
      expect(anyGroup.children?.[0].type).toBe('Points');
      expect(anyGroup.children?.[1].type).toBe('Points');
    } finally {
      const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        await maybePromise;
      }
    }
  });

  it('does not render particles when ambientParticlesEnabled override is false', async () => {
    useGameStore.setState({ visualQualityOverrides: { ambientParticlesEnabled: false } });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <AmbientParticles />
      </VisualQualityProvider>
    );

    try {
      expect(renderer.scene.children.length).toBe(0);
    } finally {
      const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        await maybePromise;
      }
    }
  });
});
