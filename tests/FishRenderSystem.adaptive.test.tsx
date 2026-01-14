import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { act } from '@testing-library/react';
import * as THREE from 'three';

import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { FishRenderSystem } from '../src/systems/FishRenderSystem';
import { world } from '../src/store';
import { useGameStore } from '../src/gameStore';
import { useQualityStore } from '../src/performance/qualityStore';

// Capture frame callbacks so tests can invoke them deterministically
const frameCallbacks: Array<(state: unknown, delta: number) => void> = [];

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: unknown, delta: number) => void) => {
    frameCallbacks.push(cb);
  },
}));

// Mock GLTF loader to provide simple scenes (three box meshes)
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

vi.mock('@react-three/drei', async () => {
  const actual = await vi.importActual<typeof import('@react-three/drei')>('@react-three/drei');
  return {
    ...actual,
    useGLTF: useGLTFMock,
  };
});

// Minimal ResizeObserver shim for tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('FishRenderSystem adaptive instance updates', () => {
  beforeEach(() => {
    frameCallbacks.length = 0;
    resetUseGLTFMock();

    // three simple scenes (one mesh each)
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

    // Reset stores
    act(() => {
      useGameStore.setState({ visualQualityOverrides: {} });
      useQualityStore.setState({ instanceUpdateBudget: 128 }); // default
    });

    // ensure clean world
    world.entities.length = 0;

    // Make Math.random deterministic so all fish pick modelIndex 0
    vi.spyOn(Math, 'random').mockImplementation(() => 0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    frameCallbacks.length = 0;
    world.entities.length = 0;
    // Clear the PoC flag safely
    delete (window as unknown as { __vibe_poc_enabled?: boolean }).__vibe_poc_enabled;
  });

  it('uses direct per-entity matrix writes when adaptive PoC is disabled', async () => {

    // Create many fish entities (all will be assigned model 0 via Math.random stub)
    const N = 100;
    for (let i = 0; i < N; i++) {
      world.add({ isFish: true, position: new THREE.Vector3(i, 0, 0), velocity: new THREE.Vector3(1, 0, 0) });
    }

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <FishRenderSystem />
      </VisualQualityProvider>
    );

    expect(frameCallbacks.length).toBeGreaterThan(0);

    // Verify test renderer created instanced meshes with real instances
    expect((renderer.scene.children.length)).toBeGreaterThanOrEqual(1);
    // @ts-expect-error - test renderer node shape
    expect(Boolean(renderer.scene.children[0].instance?.isInstancedMesh)).toBe(true);
    // @ts-expect-error - test renderer node shape
    expect(typeof renderer.scene.children[0].instance?.setMatrixAt).toBe('function');

    // Spy directly on the test renderer's instance setMatrixAt (some renderers wrap the prototype)
    // @ts-expect-error - test renderer node shape
    const instanceObj = renderer.scene.children[0].instance;
    const instanceSpy = vi.spyOn(instanceObj, 'setMatrixAt');

    await act(async () => {
      // allow effects/useFrame to mount refs by stepping a few frames
      await Promise.resolve();
      for (let i = 0; i < 3; i++) frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    // Baseline path: verify instances were seen and counts updated
    // @ts-expect-error - test renderer node shape
    const inst = renderer.scene.children[0].instance;
    expect(inst.count).toBeGreaterThanOrEqual(1);
    // If matrices were written directly, setMatrixAt should have been called for most instances
    expect(instanceSpy.mock.calls.length).toBeGreaterThanOrEqual(Math.max(1, Math.floor(N * 0.9)));

    const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
      await maybePromise;
    }
  });

  it('buffers instance writes and limits setMatrixAt calls when adaptive PoC is enabled', async () => {

    // Enable adaptive PoC via overrides + window flag
    act(() => {
      useGameStore.setState({ visualQualityOverrides: { adaptiveInstanceUpdatesEnabled: true } });
      (window as unknown as { __vibe_poc_enabled?: boolean }).__vibe_poc_enabled = true;
      // Keep budget low (min enforced to 8 by setter) which limits per-model flush
      useQualityStore.setState({ instanceUpdateBudget: 8 });
    });

    const N = 100;
    for (let i = 0; i < N; i++) {
      world.add({ isFish: true, position: new THREE.Vector3(i, 0, 0), velocity: new THREE.Vector3(1, 0, 0) });
    }

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <FishRenderSystem />
      </VisualQualityProvider>
    );

    expect(frameCallbacks.length).toBeGreaterThan(0);

    await act(async () => {
      // allow effects/useFrame to mount refs by stepping a few frames
      await Promise.resolve();
      for (let i = 0; i < 3; i++) frameCallbacks.forEach((cb) => cb({}, 1 / 60));
    });

    // With instanceUpdateBudget = 8 enforced min, per-model budget = ceil(8/3) = 3
    // Only a few matrices will be flushed per frame; ensure it's significantly less than N
    expect(setMatrixSpy.mock.calls.length).toBeLessThan(N / 10);

    const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
      await maybePromise;
    }
  });
});
