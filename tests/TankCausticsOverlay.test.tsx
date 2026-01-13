import { describe, it, expect, beforeEach, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import React from 'react';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { useGameStore } from '../src/gameStore';
import { TankCausticsOverlay } from '../src/components/Tank';

const { useFrameSpy, getCapturedFrameCallback, resetCapturedFrameCallback } = vi.hoisted(() => {
  let captured: ((state: unknown) => void) | undefined;
  const spy = vi.fn((callback: (state: unknown) => void) => {
    captured = callback;
  });

  return {
    useFrameSpy: spy,
    getCapturedFrameCallback: () => captured,
    resetCapturedFrameCallback: () => {
      captured = undefined;
    },
  };
});

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');
  return {
    ...actual,
    useFrame: useFrameSpy,
  };
});

// Mock ResizeObserver which is needed by R3F/Three
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TankCausticsOverlay', () => {
  beforeEach(() => {
    useGameStore.setState({ visualQualityOverrides: {} });
    useFrameSpy.mockClear();
    resetCapturedFrameCallback();
  });

  it('renders overlay shader with expected uniforms when caustics enabled', async () => {
    useGameStore.setState({ visualQualityOverrides: { causticsEnabled: true } });

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

      const frameCallback = getCapturedFrameCallback();
      expect(typeof frameCallback).toBe('function');

      frameCallback?.({ clock: { elapsedTime: 123 } });
      expect(material.uniforms.time.value).toBe(123);
    } finally {
      const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        await maybePromise;
      }
    }
  });

  it('does not render overlay when caustics disabled via visualQualityOverrides', async () => {
    useGameStore.setState({ visualQualityOverrides: { causticsEnabled: false } });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <TankCausticsOverlay />
      </VisualQualityProvider>
    );

    try {
      expect(useFrameSpy).not.toHaveBeenCalled();
      expect(renderer.scene.children.length).toBe(0);
    } finally {
      const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        await maybePromise;
      }
    }
  });
});
