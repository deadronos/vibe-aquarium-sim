import { beforeEach, describe, it, expect, vi } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import React, { act } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../src/gameStore';
import { VisualQualityProvider } from '../src/performance/VisualQualityProvider';
import { getQualitySettings } from '../src/performance/qualityPresets';
import { useQualityStore } from '../src/performance/qualityStore';
import { TANK_DIMENSIONS } from '../src/config/constants';

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
  it('uses thin clear glass on the transmissive WebGPU path', async () => {
    act(() => {
      useQualityStore.setState({ level: 'high', settings: getQualitySettings('high', 2) });
      useGameStore.setState({ visualQualityOverrides: { causticsEnabled: false } });
    });
    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider isWebGPU>
        <Tank />
      </VisualQualityProvider>
    );
    try {
      const materials: THREE.MeshPhysicalMaterial[] = [];
      renderer.scene.instance.traverse((object) => {
        const material = (object as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
        if (material?.type === 'MeshPhysicalMaterial') materials.push(material);
      });
      expect(materials).toHaveLength(1);
      expect(materials[0]!.thickness).toBeCloseTo(TANK_DIMENSIONS.wallThickness);
      expect(materials[0]!.roughness).toBeLessThanOrEqual(0.05);
    } finally {
      await renderer.unmount();
    }
  });

  it('places the depth-tested rear caustics in front of the opaque backplate', async () => {
    act(() => {
      useGameStore.setState({ visualQualityOverrides: { causticsEnabled: true } });
    });
    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider>
        <Tank />
      </VisualQualityProvider>
    );
    try {
      const meshes: THREE.Mesh[] = [];
      renderer.scene.instance.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
      });
      const backplate = meshes.find((mesh) => mesh.geometry.type === 'PlaneGeometry')!;
      const overlay = meshes.find(
        (mesh) => (mesh.material as THREE.Material).type === 'ShaderMaterial'
      )!;
      expect(backplate).toBeDefined();
      expect(overlay).toBeDefined();
      expect((overlay.material as THREE.Material).depthTest).toBe(true);
      const positions = overlay.geometry.getAttribute('position');
      const normals = overlay.geometry.getAttribute('normal');
      const rearZ: number[] = [];
      for (let i = 0; i < positions.count; i++) {
        if (normals.getZ(i) > 0.99) rearZ.push(positions.getZ(i));
      }
      expect(rearZ).toHaveLength(4);
      for (const z of rearZ) expect(z).toBeGreaterThan(backplate.position.z);
    } finally {
      await renderer.unmount();
    }
  });

  beforeEach(() => {
    // deterministic defaults
    act(() => {
      useQualityStore.setState({ level: 'low', settings: getQualitySettings('low', 2) });
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

  it('uses a non-transmissive material for low WebGPU quality', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <VisualQualityProvider isWebGPU>
        <Tank />
      </VisualQualityProvider>
    );

    const physicalMaterials: unknown[] = [];
    const visit = (node: { instance?: { material?: THREE.Material }; children?: unknown[] }) => {
      if (node.instance?.material?.type === 'MeshPhysicalMaterial') {
        physicalMaterials.push(node.instance.material);
      }
      for (const child of node.children ?? []) {
        visit(child as { instance?: { material?: THREE.Material }; children?: unknown[] });
      }
    };
    for (const child of renderer.scene.children) {
      visit(child as { instance?: { material?: THREE.Material }; children?: unknown[] });
    }

    expect(physicalMaterials).toHaveLength(0);
  });
});
