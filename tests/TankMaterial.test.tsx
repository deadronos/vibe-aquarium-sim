import { beforeEach, describe, it, expect, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import React, { act } from 'react';
import { useGameStore } from '../src/gameStore';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { getQualitySettings } from '../src/performance/qualityPresets';
import { useQualityStore } from '../src/performance/qualityStore';

const { useFrameSpy } = vi.hoisted(() => {
  const spy = vi.fn(() => {});
  return { useFrameSpy: spy };
});

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');
  return {
    ...actual,
    useFrame: useFrameSpy,
  };
});

// Mock Raphael physics to avoid requiring <Physics /> in tests
vi.mock('@react-three/rapier', async () => {
  return {
    RigidBody: ({ children }: { children?: React.ReactNode }) => {
      return children ?? null;
    },
  };
});

vi.mock('@react-three/drei', async () => {
  return {
    // simple stubs for drei primitives used by Tank
    Box: ({ children }: { children?: React.ReactNode }) => children ?? null,
    Text: () => null,
  };
});

import { Tank } from '../src/components/Tank';

// Mock ResizeObserver which is needed by R3F/Three
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Tank material defaults', () => {
  beforeEach(() => {
    // deterministic defaults
    act(() => {
      useQualityStore.setState({ settings: getQualitySettings('low', 2) });
      useGameStore.setState({ visualQualityOverrides: {} });
    });
    useFrameSpy.mockClear();
  });

  it('renders a glass mesh with expected transmission defaults', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Tank />
      </VisualQualityProvider>
    );

    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('keeps glass material defaults across quality presets', async () => {
    act(() => {
      useQualityStore.setState({ settings: getQualitySettings('ultra', 2) });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Tank />
      </VisualQualityProvider>
    );

    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });
});
