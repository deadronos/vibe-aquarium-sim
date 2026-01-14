import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import React from 'react';

import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { useGameStore } from '../src/gameStore';
import { useQualityStore } from '../src/performance/qualityStore';
import { getQualitySettings } from '../src/performance/qualityPresets';

const { EffectComposerMock, DepthOfFieldMock } = vi.hoisted(() => {
  const EffectComposerMock = ({ children }: { children?: React.ReactNode }) => (
    <group name="EffectComposer">{children}</group>
  );

  const DepthOfFieldMock = () => <group name="DepthOfField" />;

  return { EffectComposerMock, DepthOfFieldMock };
});

vi.mock('@react-three/postprocessing', () => {
  return {
    EffectComposer: EffectComposerMock,
    DepthOfField: DepthOfFieldMock,
  };
});

import { PostProcessing } from '../src/components/PostProcessing';

// Mock ResizeObserver which is needed by R3F/Three
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('PostProcessing', () => {
  beforeEach(() => {
    act(() => {
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
  });

  it('does not mount EffectComposer when depthOfFieldEnabled is false', async () => {
    useGameStore.setState({ visualQualityOverrides: { depthOfFieldEnabled: false } });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <PostProcessing />
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

  it('mounts EffectComposer + DepthOfField when depthOfFieldEnabled is true', async () => {
    useGameStore.setState({ visualQualityOverrides: { depthOfFieldEnabled: true } });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <PostProcessing />
      </VisualQualityProvider>
    );

    try {
      expect(renderer.scene.children.length).toBe(1);
      const root = renderer.scene.children[0];
      expect(root.type).toBe('Group');

      const anyRoot = root as unknown as { children?: Array<{ type: string }> };
      expect(anyRoot.children?.length).toBe(1);
      expect(anyRoot.children?.[0].type).toBe('Group');
    } finally {
      const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        await maybePromise;
      }
    }
  });
});
