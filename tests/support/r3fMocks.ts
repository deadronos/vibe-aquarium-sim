import { vi, type Mock } from 'vitest';
import type * as THREE from 'three';

export type FrameCallback = (state: unknown, delta?: number) => void;

export type UseFrameMode = 'push' | 'replace';

export interface UseFrameMock {
  useFrame: Mock<(callback: FrameCallback) => void>;
  frameCallbacks: FrameCallback[];
  getFrameCallback: () => FrameCallback | undefined;
  resetUseFrameMock: () => void;
}

/**
 * Builds a `useFrame` mock plus the captured callbacks.
 *
 * `push` keeps every subscription (used when a test asserts on call counts
 * across mounts); `replace` keeps only the most recently rendered callback so
 * a store update does not replay a stale closure.
 *
 * Import this lazily inside `vi.hoisted`/`vi.mock` factories because those run
 * before static imports are evaluated.
 */
export function createUseFrameMock(mode: UseFrameMode = 'push'): UseFrameMock {
  const frameCallbacks: FrameCallback[] = [];
  const useFrame = vi.fn((callback: FrameCallback) => {
    if (mode === 'replace') {
      frameCallbacks[0] = callback;
    } else {
      frameCallbacks.push(callback);
    }
  });

  return {
    useFrame,
    frameCallbacks,
    getFrameCallback: () => frameCallbacks[frameCallbacks.length - 1],
    resetUseFrameMock: () => {
      frameCallbacks.length = 0;
      useFrame.mockClear();
    },
  };
}

export interface UseGLTFMock {
  useGLTFMock: Mock<(url: string) => { scene: THREE.Object3D }>;
  setUseGLTFScenes: (scenes: THREE.Object3D[]) => void;
  resetUseGLTFMock: () => void;
}

/**
 * Builds the deterministic `useGLTF` mock used by the fish render tests. The
 * model index is derived from the URL (`fish3` -> 2, `fish2` -> 1, else 0) and
 * falls back to the last registered scene.
 */
export function createUseGLTFMock(): UseGLTFMock {
  let scenes: THREE.Object3D[] = [];

  const useGLTFMock = vi.fn((url: string) => {
    const index = url.includes('fish3') ? 2 : url.includes('fish2') ? 1 : 0;
    const scene = scenes[index] ?? scenes[scenes.length - 1];
    return { scene } as unknown as { scene: THREE.Object3D };
  });

  return {
    useGLTFMock,
    setUseGLTFScenes: (nextScenes) => {
      scenes = nextScenes;
    },
    resetUseGLTFMock: () => {
      useGLTFMock.mockClear();
    },
  };
}
