import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import React from 'react';

import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { useGameStore } from '../src/gameStore';
import { unmountTestRenderer } from './support/r3fTestRenderer';
import { resetGameStore, resetQualityStore } from './support/stores';

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

vi.mock('../src/components/vfx/EffectComposer', () => {
  return {
    EffectComposer: EffectComposerMock,
  };
});

import { PostProcessing } from '../src/components/PostProcessing';

describe('PostProcessing', () => {
  beforeEach(() => {
    act(() => {
      // Make tests deterministic and order-independent.
      resetQualityStore('low');
      resetGameStore();
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
      await unmountTestRenderer(renderer);
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
      await unmountTestRenderer(renderer);
    }
  });
});
