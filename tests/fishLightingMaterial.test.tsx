import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import React, { act } from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';

import { useGameStore } from '../src/gameStore';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { FishRenderSystem } from '../src/systems/FishRenderSystem';
import {
  VIBE_FISH_LIGHTING_MARKER,
  enhanceFishMaterialWithRimAndSSS,
  type VibeFishLightingUniforms,
} from '../src/shaders/fishLightingMaterial';

const { useFrameSpy } = vi.hoisted(() => {
  return {
    useFrameSpy: vi.fn(),
  };
});

vi.mock('@react-three/fiber', async () => {
  const actual = await vi.importActual<typeof import('@react-three/fiber')>('@react-three/fiber');
  return {
    ...actual,
    useFrame: useFrameSpy,
  };
});

const { useGLTFMock, resetUseGLTFMock, setUseGLTFScenes } = vi.hoisted(() => {
  let callIndex = 0;

  let scenes: Array<{ traverse: (fn: (child: unknown) => void) => void }> = [];

  const useGLTFMock = vi.fn(() => {
    const scene = scenes[callIndex] ?? scenes[scenes.length - 1];
    callIndex++;
    return { scene };
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

// Mock ResizeObserver which is needed by R3F/Three
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('fish lighting material injection', () => {
  beforeEach(() => {
    resetUseGLTFMock();

    // Reset overrides first to avoid cross-test contamination.
    act(() => {
      useGameStore.setState({ visualQualityOverrides: {} });
    });

    // Ensure the mocked GLTF loader returns stable, Three-backed scenes.
    const makeScene = (material: THREE.Material) => {
      const scene = new THREE.Object3D();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      scene.add(mesh);
      return scene;
    };

    const matA = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const matB = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const matC = new THREE.MeshStandardMaterial({ color: 0x0000ff });

    setUseGLTFScenes([makeScene(matA), makeScene(matB), makeScene(matC)]);
  });

  afterEach(() => {
    act(() => {
      useGameStore.setState({ visualQualityOverrides: {} });
    });
  });

  it('injects shader markers into onBeforeCompile-modified shader source', () => {
    const base = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const { material } = enhanceFishMaterialWithRimAndSSS(base);
    expect(material).not.toBe(base);

    const shader = {
      uniforms: {},
      vertexShader: 'void main() {}',
      fragmentShader: `
        #include <common>
        void main() {
          vec3 outgoingLight = vec3(0.0);
          #include <output_fragment>
        }
      `,
    };

    // @ts-expect-error - minimal shader shape for unit test
    material.onBeforeCompile(shader);
    expect(shader.fragmentShader).toContain(VIBE_FISH_LIGHTING_MARKER);
  });

  it('clones materials and does not mutate the original', () => {
    const base = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const baseOnBeforeCompile = base.onBeforeCompile;
    const { material, uniforms } = enhanceFishMaterialWithRimAndSSS(base);

    expect(material).not.toBe(base);
    // Enhancement must not mutate the source material.
    expect(base.onBeforeCompile).toBe(baseOnBeforeCompile);

    base.color.set(0x00ff00);
    expect((material as THREE.MeshStandardMaterial).color.getHex()).not.toBe(base.color.getHex());

    // uniforms live on the clone, not the original
    expect((base.userData as Record<string, unknown>).vibeFishLighting).toBeUndefined();
    expect((material.userData as Record<string, unknown>).vibeFishLighting).toBeDefined();

    // and the returned uniform object is stable
    expect(uniforms).toBeDefined();
    expect(typeof (uniforms as VibeFishLightingUniforms).vibeRimStrength.value).toBe('number');
  });

  it('sets rim/sss strengths to 0 when disabled via visualQualityOverrides', async () => {
    useFrameSpy.mockClear();

    act(() => {
      useGameStore.setState({
        visualQualityOverrides: {
          fishRimLightingEnabled: false,
          fishSubsurfaceScatteringEnabled: false,
        },
      });
    });

    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <FishRenderSystem />
      </VisualQualityProvider>
    );

    try {
      expect(renderer.scene.children.length).toBe(3);

      for (const child of renderer.scene.children) {
        // @ts-expect-error - test renderer node shape
        expect(Boolean(child.instance?.isInstancedMesh)).toBe(true);

        // @ts-expect-error - test renderer node shape
        const mat = child.instance.material as THREE.Material | THREE.Material[];
        const mats = Array.isArray(mat) ? mat : [mat];

        for (const m of mats) {
          const data = m.userData as Record<string, unknown>;
          const lighting = data.vibeFishLighting as
            | { uniforms: VibeFishLightingUniforms }
            | undefined;
          expect(lighting).toBeDefined();

          expect(lighting!.uniforms.vibeRimStrength.value).toBe(0);
          expect(lighting!.uniforms.vibeSSSStrength.value).toBe(0);
        }
      }
    } finally {
      const maybePromise = (renderer as unknown as { unmount?: () => unknown }).unmount?.();
      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        await maybePromise;
      }
    }
  });
});
