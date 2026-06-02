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

// Capture frame callbacks so tests can invoke them deterministically
const frameCallbacks: Array<(state: unknown, delta: number) => void> = [];

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');
  return {
    ...actual,
    useFrame: (cb: (state: unknown, delta: number) => void) => {
      frameCallbacks.push(cb);
    },
  };
});

const { useGLTFMock, setUseGLTFScenes, resetUseGLTFMock } = vi.hoisted(() => {
  let callIndex = 0;
  let scenes: Array<{ traverse: (fn: (child: unknown) => void) => void }> = [];

  const useGLTFMock = vi.fn(() => {
    const scene = scenes[callIndex] ?? scenes[scenes.length - 1];
    callIndex++;
    return { scene } as unknown as { scene: THREE.Object3D };
  });

  return {
    useGLTFMock,
    setUseGLTFScenes: (nextScenes: typeof scenes) => {
      scenes = nextScenes;
    },
    resetUseGLTFMock: () => {
      callIndex = 0;
      useGLTFMock.mockClear();
    },
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
    frameCallbacks.length = 0;
    resetUseGLTFMock();
    resetInstanceCapWarnings();

    const makeScene = (mat: THREE.Material) => {
      const scene = new THREE.Object3D();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), mat);
      scene.add(mesh);
      return scene;
    };

    setUseGLTFScenes([
      makeScene(new THREE.MeshStandardMaterial({ color: 0xff0000 })),
      makeScene(new THREE.MeshStandardMaterial({ color: 0x00ff00 })),
      makeScene(new THREE.MeshStandardMaterial({ color: 0x0000ff })),
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
    frameCallbacks.length = 0;
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
    const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
      await maybePromise;
    }
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
    const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
      await maybePromise;
    }
  });
});
