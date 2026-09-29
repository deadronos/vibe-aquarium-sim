import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { act } from '@testing-library/react';
import * as THREE from 'three';

import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { FishRenderSystem } from '../src/systems/FishRenderSystem';
import { resetInstanceCapWarnings } from '../src/systems/instanceCapWarning';
import { world } from '../src/store';
import { useGameStore } from '../src/gameStore';
import { useQualityStore } from '../src/performance/qualityStore';
import { FISH_SCENE_DIMENSIONS, makeScene } from './support/fishScenes';
import { unmountTestRenderer } from './support/r3fTestRenderer';

// Capture frame callbacks so tests can invoke them deterministically
const { useFrame, frameCallbacks, resetUseFrameMock } = await vi.hoisted(async () => {
  const { createUseFrameMock } = await import('./support/r3fMocks');
  return createUseFrameMock();
});

const { useGLTFMock, setUseGLTFScenes, resetUseGLTFMock } = await vi.hoisted(async () => {
  const { createUseGLTFMock } = await import('./support/r3fMocks');
  return createUseGLTFMock();
});

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');
  return {
    ...actual,
    useFrame,
  };
});

vi.mock('@react-three/drei', () => {
  return {
    useGLTF: useGLTFMock,
  };
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('FishRenderSystem instance cap warning', () => {
  beforeEach(() => {
    resetUseFrameMock();
    resetUseGLTFMock();
    resetInstanceCapWarnings();

    setUseGLTFScenes([
      makeScene(0xff0000, FISH_SCENE_DIMENSIONS),
      makeScene(0x00ff00, FISH_SCENE_DIMENSIONS),
      makeScene(0x0000ff, FISH_SCENE_DIMENSIONS),
    ]);

    act(() => {
      useGameStore.setState({ visualQualityOverrides: {} });
      useQualityStore.setState({ instanceUpdateBudget: 128 });
    });

    world.entities.length = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => 0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetUseFrameMock();
    world.entities.length = 0;
  });

  it('warns via console.warn when fish exceed the per-model instance cap', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Create more than MAX_INSTANCES_PER_MODEL (1000) fish of model 0
    const N = 1001;
    for (let i = 0; i < N; i++) {
      world.add({
        isFish: true,
        position: new THREE.Vector3(i * 0.01, 0, 0),
        velocity: new THREE.Vector3(1, 0, 0),
      });
    }

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <FishRenderSystem />
      </VisualQualityProvider>
    );

    expect(frameCallbacks.length).toBeGreaterThan(0);

    await act(async () => {
      await Promise.resolve();
      for (let i = 0; i < 3; i++) frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    // The cap should have triggered a warning
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MAX_INSTANCES_PER_MODEL'));

    warnSpy.mockRestore();
    await unmountTestRenderer(renderer);
  });

  it('warns at most once per model per session', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const N = 1001;
    for (let i = 0; i < N; i++) {
      world.add({
        isFish: true,
        position: new THREE.Vector3(i * 0.01, 0, 0),
        velocity: new THREE.Vector3(1, 0, 0),
      });
    }

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <FishRenderSystem />
      </VisualQualityProvider>
    );

    await act(async () => {
      await Promise.resolve();
      // Run multiple frames to verify the warning isn't repeated
      for (let i = 0; i < 5; i++) frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    // Should only warn once (not N times)
    const capWarnings = warnSpy.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('MAX_INSTANCES_PER_MODEL')
    );
    expect(capWarnings.length).toBe(1);

    warnSpy.mockRestore();
    await unmountTestRenderer(renderer);
  });
});
