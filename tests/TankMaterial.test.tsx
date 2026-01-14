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

// Capture props passed to MeshTransmissionMaterial by mocking '@react-three/drei'
const capturedTransmissionProps: Record<string, unknown>[] = [];
vi.mock('@react-three/drei', async () => {
  const actual = await vi.importActual<typeof import('@react-three/drei')>('@react-three/drei');
  return {
    ...actual,
    MeshTransmissionMaterial: (props: Record<string, unknown>) => {
      capturedTransmissionProps.push(props);
      return null;
    },
    // simple stubs for other drei primitives used by Tank
    Box: () => null,
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
    await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Tank />
      </VisualQualityProvider>
    );

    // Prefer checking props captured by our mocked MeshTransmissionMaterial
    expect(capturedTransmissionProps.length).toBeGreaterThan(0);
    const last = capturedTransmissionProps[capturedTransmissionProps.length - 1];

    expect(typeof last.opacity === 'number' || typeof last.opacity === 'string').toBeTruthy();
    expect(Number(last.opacity)).toBeCloseTo(0.4);
    expect(Number(last.ior)).toBeCloseTo(1.5);

    if (typeof last.attenuationDistance === 'number') {
      expect(Number(last.attenuationDistance)).toBeCloseTo(0.01);
      if (typeof last.attenuationColor === 'string') {
        expect((last.attenuationColor as string).replace('#', '')).toBe('95abf6');
      }
    }
  });

  it('respects quality preset for transmission samples/resolution', async () => {
    act(() => {
      useQualityStore.setState({ settings: getQualitySettings('ultra', 2) });
    });

    await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Tank />
      </VisualQualityProvider>
    );

    expect(capturedTransmissionProps.length).toBeGreaterThan(0);
    const last = capturedTransmissionProps[capturedTransmissionProps.length - 1];
    if (typeof last.samples === 'number') expect(last.samples as number).toBeGreaterThanOrEqual(6);
    if (typeof last.resolution === 'number') expect(last.resolution as number).toBeGreaterThanOrEqual(1024);
  });
});
