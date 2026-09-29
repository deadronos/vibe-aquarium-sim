import { beforeEach, describe, expect, it } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import React, { act } from 'react';

import { AmbientParticles } from '../src/components/AmbientParticles';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { useGameStore } from '../src/gameStore';
import { unmountTestRenderer } from './support/r3fTestRenderer';
import { resetGameStore, resetQualityStore } from './support/stores';

describe('AmbientParticles', () => {
  beforeEach(() => {
    act(() => {
      // Make tests deterministic and order-independent.
      resetQualityStore('low');
      resetGameStore();
    });
  });

  it('renders particles when ambientParticlesEnabled override is true', async () => {
    act(() => {
      useGameStore.setState({ visualQualityOverrides: { ambientParticlesEnabled: true } });
    });

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
      await unmountTestRenderer(renderer);
    }
  });

  it('does not render particles when ambientParticlesEnabled override is false', async () => {
    act(() => {
      useGameStore.setState({ visualQualityOverrides: { ambientParticlesEnabled: false } });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <AmbientParticles />
      </VisualQualityProvider>
    );

    try {
      expect(renderer.scene.children.length).toBe(0);
    } finally {
      await unmountTestRenderer(renderer);
    }
  });
});
