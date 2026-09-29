import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import React, { act } from 'react';

import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { useGameStore } from '../src/gameStore';
import { TankCausticsOverlay } from '../src/components/Tank';
import { unmountTestRenderer } from './support/r3fTestRenderer';

const {
  useFrame: useFrameSpy,
  getFrameCallback,
  resetUseFrameMock,
} = await vi.hoisted(async () => {
  const { createUseFrameMock } = await import('./support/r3fMocks');
  return createUseFrameMock('replace');
});

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');
  return {
    ...actual,
    useFrame: useFrameSpy,
  };
});

vi.mock('@react-three/drei', () => {
  return {
    Box: ({ children }: { children?: React.ReactNode }) => children ?? null,
  };
});

vi.mock('@react-three/rapier', () => {
  return {
    RigidBody: ({ children }: { children?: React.ReactNode }) => children ?? null,
  };
});

describe('TankCausticsOverlay', () => {
  beforeEach(() => {
    act(() => {
      useGameStore.setState({ visualQualityOverrides: {} });
    });
    resetUseFrameMock();
  });

  it('renders overlay shader with expected uniforms when caustics enabled', async () => {
    act(() => {
      useGameStore.setState({ visualQualityOverrides: { causticsEnabled: true } });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <TankCausticsOverlay />
      </VisualQualityProvider>
    );

    try {
      expect(useFrameSpy).toHaveBeenCalled();

      expect(renderer.scene.children.length).toBe(1);
      const mesh = renderer.scene.children[0];
      expect(mesh.type).toBe('Mesh');

      // @ts-expect-error - mesh.instance.material has no type in test environment
      const material = mesh.instance.material;
      expect(material.type).toBe('ShaderMaterial');

      expect(material.uniforms.time).toBeDefined();
      expect(material.uniforms.intensity).toBeDefined();

      expect(typeof material.uniforms.intensity.value).toBe('number');
      expect(material.uniforms.intensity.value).toBeGreaterThan(0);

      const frameCallback = getFrameCallback();
      expect(typeof frameCallback).toBe('function');

      frameCallback?.({ clock: { elapsedTime: 123 } });
      expect(material.uniforms.time.value).toBe(123);
    } finally {
      await unmountTestRenderer(renderer);
    }
  });

  it('does not render overlay when caustics disabled via visualQualityOverrides', async () => {
    act(() => {
      useGameStore.setState({ visualQualityOverrides: { causticsEnabled: false } });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <TankCausticsOverlay />
      </VisualQualityProvider>
    );

    try {
      expect(useFrameSpy).not.toHaveBeenCalled();
      expect(renderer.scene.children.length).toBe(0);
    } finally {
      await unmountTestRenderer(renderer);
    }
  });
});
