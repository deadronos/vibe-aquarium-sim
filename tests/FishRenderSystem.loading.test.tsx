import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import * as THREE from 'three';

import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { FishRenderSystem } from '../src/systems/FishRenderSystem';
import { MODEL_URLS } from '../src/systems/fishModels';
import { useGameStore } from '../src/gameStore';

const { useGLTFMock, setResponse, resetResponses } = vi.hoisted(() => {
  type Response = { scene: THREE.Object3D } | Error | Promise<never>;
  const responses = new Map<string, Response>();
  const useGLTFMock = vi.fn((url: string) => {
    const response = responses.get(url);
    if (response instanceof Error || response instanceof Promise) throw response;
    if (!response) throw new Error(`No mocked GLTF response for ${url}`);
    return response;
  });

  return {
    useGLTFMock,
    setResponse: (url: string, response: Response) => responses.set(url, response),
    resetResponses: () => {
      responses.clear();
      useGLTFMock.mockClear();
    },
  };
});

vi.mock('@react-three/drei', () => ({ useGLTF: useGLTFMock }));

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');
  return { ...actual, useFrame: vi.fn() };
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const makeScene = (color: number) => {
  const scene = new THREE.Object3D();
  scene.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), new THREE.MeshStandardMaterial({ color }))
  );
  return scene;
};

const unmount = async (renderer: ReactThreeTestRenderer) => {
  const result = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
  if (result && typeof (result as Promise<unknown>).then === 'function') await result;
};

describe('FishRenderSystem progressive model loading', () => {
  beforeEach(() => {
    resetResponses();
    delete window.__vibe_fishAssetStatus;
    act(() => useGameStore.setState({ visualQualityOverrides: {} }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.__vibe_fishAssetStatus;
  });

  it('requests the primary model before deferred variants', async () => {
    setResponse(MODEL_URLS[0], { scene: makeScene(0xff0000) });
    setResponse(MODEL_URLS[1], new Promise<never>(() => {}));
    setResponse(MODEL_URLS[2], new Promise<never>(() => {}));

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <FishRenderSystem />
      </VisualQualityProvider>
    );

    try {
      expect(useGLTFMock.mock.calls[0]?.[0]).toBe(MODEL_URLS[0]);
      expect([...new Set(useGLTFMock.mock.calls.map(([url]) => url))]).toEqual([
        MODEL_URLS[0],
        MODEL_URLS[1],
      ]);
      expect(renderer.scene.children).toHaveLength(1);
      expect(window.__vibe_fishAssetStatus).toMatchObject({
        primary: 'ready',
        variants: ['loading', 'loading'],
      });
    } finally {
      await unmount(renderer);
    }
  });

  it('keeps the primary mesh when a variant fails and publishes its error status', async () => {
    setResponse(MODEL_URLS[0], { scene: makeScene(0xff0000) });
    setResponse(MODEL_URLS[1], new Error('variant download failed'));
    setResponse(MODEL_URLS[2], { scene: makeScene(0x0000ff) });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <FishRenderSystem />
      </VisualQualityProvider>
    );

    try {
      const diagnostic = errorSpy.mock.calls.filter(
        ([message]) => message === 'FishRenderSystem: failed to load model #1'
      );
      expect(diagnostic).toHaveLength(1);
      expect(renderer.scene.children).toHaveLength(2);
      expect(window.__vibe_fishAssetStatus).toMatchObject({
        primary: 'ready',
        variants: ['error', 'ready'],
      });
    } finally {
      await unmount(renderer);
    }
  });

  it('publishes ready after both deferred variants settle', async () => {
    setResponse(MODEL_URLS[0], { scene: makeScene(0xff0000) });
    setResponse(MODEL_URLS[1], { scene: makeScene(0x00ff00) });
    setResponse(MODEL_URLS[2], { scene: makeScene(0x0000ff) });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <FishRenderSystem />
      </VisualQualityProvider>
    );

    try {
      expect(renderer.scene.children).toHaveLength(3);
      expect(window.__vibe_fishAssetStatus).toMatchObject({
        primary: 'ready',
        variants: ['ready', 'ready'],
      });
    } finally {
      await unmount(renderer);
      expect(window.__vibe_fishAssetStatus).toBeUndefined();
    }
  });
});
