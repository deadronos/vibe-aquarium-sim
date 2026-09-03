import { Component, useEffect, useMemo, type MutableRefObject, type ReactNode } from 'react';
import { InstancedMesh } from 'three';
import * as THREE from 'three';

import { MAX_INSTANCES_PER_MODEL } from './instanceCapWarning';
import { extractModelAssets, type FishModelIndex } from './fishModels';
import {
  DEFAULT_VIBE_FISH_RIM_STRENGTH,
  DEFAULT_VIBE_FISH_SSS_STRENGTH,
  enhanceFishMaterialWithRimAndSSS,
  type VibeFishLightingUniforms,
} from '../shaders/fishLightingMaterial';

type LoadedGltf = { scene: THREE.Object3D };

type FishModelMeshProps = {
  modelIndex: FishModelIndex;
  gltf: LoadedGltf;
  meshRef: MutableRefObject<InstancedMesh | null>;
  uniformsRef: MutableRefObject<VibeFishLightingUniforms[]>;
  fishRimLightingEnabled: boolean;
  fishSubsurfaceScatteringEnabled: boolean;
  isWebGPU: boolean;
  onReady: () => void;
};

const normalizeUniforms = (
  uniforms: VibeFishLightingUniforms | VibeFishLightingUniforms[]
): VibeFishLightingUniforms[] => (Array.isArray(uniforms) ? uniforms : [uniforms]);

export const FishModelMesh = ({
  modelIndex,
  gltf,
  meshRef,
  uniformsRef,
  fishRimLightingEnabled,
  fishSubsurfaceScatteringEnabled,
  isWebGPU,
  onReady,
}: FishModelMeshProps) => {
  const { geometry, material, uniforms } = useMemo(() => {
    const assets = extractModelAssets(gltf.scene);
    let geometry: THREE.BufferGeometry | null = assets.geo;
    let material: THREE.Material | THREE.Material[] | null = assets.mat;
    if (!geometry || !material) {
      console.warn(
        `FishRenderSystem: Missing geometry/material for model #${modelIndex}, using fallback box mesh`
      );
      geometry = new THREE.BoxGeometry(0.5, 0.2, 0.1);
      material = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    }

    if (isWebGPU || (!fishRimLightingEnabled && !fishSubsurfaceScatteringEnabled)) {
      return { geometry, material, uniforms: [] };
    }

    const enhanced = Array.isArray(material)
      ? enhanceFishMaterialWithRimAndSSS(material)
      : enhanceFishMaterialWithRimAndSSS(material);
    return {
      geometry,
      material: enhanced.material,
      uniforms: normalizeUniforms(enhanced.uniforms),
    };
  }, [fishRimLightingEnabled, fishSubsurfaceScatteringEnabled, gltf.scene, isWebGPU, modelIndex]);

  useEffect(() => {
    uniformsRef.current = uniforms;
    return () => {
      if (uniformsRef.current === uniforms) uniformsRef.current = [];
    };
  }, [uniforms, uniformsRef]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  useEffect(() => {
    const rimStrength = fishRimLightingEnabled ? DEFAULT_VIBE_FISH_RIM_STRENGTH : 0;
    const sssStrength = fishSubsurfaceScatteringEnabled ? DEFAULT_VIBE_FISH_SSS_STRENGTH : 0;
    for (let i = 0; i < uniforms.length; i++) {
      const uniform = uniforms[i]!;
      uniform.vibeRimStrength.value = rimStrength;
      uniform.vibeSSSStrength.value = sssStrength;
    }
  }, [fishRimLightingEnabled, fishSubsurfaceScatteringEnabled, uniforms]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_INSTANCES_PER_MODEL]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  );
};

type FishModelErrorBoundaryProps = {
  modelIndex: FishModelIndex;
  onError: () => void;
  children: ReactNode;
};

type FishModelErrorBoundaryState = { failed: boolean };

/** Isolates optional variant loader failures from the critical primary model. */
export class FishModelErrorBoundary extends Component<
  FishModelErrorBoundaryProps,
  FishModelErrorBoundaryState
> {
  state: FishModelErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): FishModelErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    console.error(`FishRenderSystem: failed to load model #${this.props.modelIndex}`);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
