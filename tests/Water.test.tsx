import { beforeEach, describe, it, expect, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Color } from 'three';
import React, { act } from 'react';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { useGameStore } from '../src/gameStore';
import { getQualitySettings } from '../src/performance/qualityPresets';
import { useQualityStore } from '../src/performance/qualityStore';

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

import { Water } from '../src/components/Water';

// Mock ResizeObserver which is needed by R3F/Three
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Water', () => {
  beforeEach(() => {
    // Make tests deterministic: default to Low (no water upgrades).
    act(() => {
      useQualityStore.setState({ settings: getQualitySettings('low', 2) });
      useGameStore.setState({ visualQualityOverrides: {} });
    });

    useFrameSpy.mockClear();
    resetCapturedFrameCallback();
  });

  it('renders mesh and shader material with correct uniforms', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Water />
      </VisualQualityProvider>
    );

    const mesh = renderer.scene.children[0];
    expect(mesh.type).toBe('Mesh');

    // @ts-expect-error - mesh.instance.material has no type in test environment
    const material = mesh.instance.material;
    expect(material.type).toBe('ShaderMaterial');

    expect(material.uniforms.waterColor.value).toBeInstanceOf(Color);
    expect(material.uniforms.opacity.value).toBe(0.3);
    expect(material.uniforms.causticsScale.value).toBe(2.0);
    expect(material.uniforms.causticsSpeed.value).toBe(0.5);
    expect(material.uniforms.causticsIntensity.value).toBe(0.3);
    expect(material.uniforms.time.value).toBe(0);
  });

  it('renders a dedicated surface mesh when waterSurfaceUpgradeEnabled is enabled via overrides', async () => {
    act(() => {
      useGameStore.setState({
        visualQualityOverrides: {
          waterSurfaceUpgradeEnabled: true,
        },
      });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Water />
      </VisualQualityProvider>
    );

    expect(renderer.scene.children.length).toBe(2);
    expect(renderer.scene.children[0].type).toBe('Mesh');
    expect(renderer.scene.children[1].type).toBe('Mesh');
  });

  it('renders only the volume mesh when waterSurfaceUpgradeEnabled is disabled via overrides', async () => {
    act(() => {
      useGameStore.setState({
        visualQualityOverrides: {
          waterSurfaceUpgradeEnabled: false,
        },
      });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Water />
      </VisualQualityProvider>
    );

    expect(renderer.scene.children.length).toBe(1);
    expect(renderer.scene.children[0].type).toBe('Mesh');
  });

  it('includes volume upgrade uniforms and sets strength to 0 when waterVolumeUpgradeEnabled is disabled', async () => {
    act(() => {
      useGameStore.setState({
        visualQualityOverrides: {
          waterVolumeUpgradeEnabled: false,
        },
      });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Water />
      </VisualQualityProvider>
    );

    const mesh = renderer.scene.children[0];
    // @ts-expect-error - mesh.instance.material has no type in test environment
    const material = mesh.instance.material;

    expect(material.uniforms.volumeSpecularStrength).toBeDefined();
    expect(material.uniforms.volumeShimmerStrength).toBeDefined();

    expect(material.uniforms.volumeSpecularStrength.value).toBe(0);
    expect(material.uniforms.volumeShimmerStrength.value).toBe(0);
  });

  it('sets volume upgrade strength > 0 when waterVolumeUpgradeEnabled is enabled', async () => {
    act(() => {
      useGameStore.setState({
        visualQualityOverrides: {
          waterVolumeUpgradeEnabled: true,
        },
      });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Water />
      </VisualQualityProvider>
    );

    const mesh = renderer.scene.children[0];
    // @ts-expect-error - mesh.instance.material has no type in test environment
    const material = mesh.instance.material;

    expect(material.uniforms.volumeSpecularStrength.value).toBeGreaterThan(0);
    expect(material.uniforms.volumeShimmerStrength.value).toBeGreaterThan(0);
  });

  it('updates time uniform on frame', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Water />
      </VisualQualityProvider>
    );
    const mesh = renderer.scene.children[0];
    // @ts-expect-error - mesh.instance.material has no type in test environment
    const material = mesh.instance.material;

    expect(material.uniforms.time.value).toBe(0);

    expect(useFrameSpy).toHaveBeenCalled();
    const frameCallback = getCapturedFrameCallback();
    expect(typeof frameCallback).toBe('function');

    frameCallback?.({ clock: { elapsedTime: 123 } });
    expect(material.uniforms.time.value).toBe(123);
  });
});
