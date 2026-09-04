import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { InstancedMesh } from 'three';
import { useVisualQuality } from '../performance/VisualQualityContext';
import { useQualityStore } from '../performance/qualityStore';
import { MODEL_URLS, type FishModelIndex } from './fishModels';
import { FishModelMesh } from './FishModelMesh';
import type { VibeFishLightingUniforms } from '../shaders/fishLightingMaterial';
import { DeferredFishModelSlot } from './fishRender/fishRenderAssets';
import {
  clearFishRenderStatus,
  publishFishRenderStatus,
  recordFishRenderTiming,
} from './fishRender/fishRenderDiagnostics';
import { createFishRenderState, resetFishRenderState } from './fishRender/fishRenderPools';
import {
  updateFishInstances,
  type FishRenderInstanceContext,
} from './fishRender/fishRenderInstances';

export const FishRenderSystem = () => {
  const {
    fishRimLightingEnabled,
    fishSubsurfaceScatteringEnabled,
    adaptiveInstanceUpdatesEnabled,
    isWebGPU,
  } = useVisualQuality();
  const gltfA = useGLTF(MODEL_URLS[0]);
  const [primaryReady, setPrimaryReady] = useState(false);
  const [variantOneSettled, setVariantOneSettled] = useState(false);
  const meshRefA = useRef<InstancedMesh | null>(null);
  const meshRefB = useRef<InstancedMesh | null>(null);
  const meshRefC = useRef<InstancedMesh | null>(null);
  const uniformsARef = useRef<VibeFishLightingUniforms[]>([]);
  const uniformsBRef = useRef<VibeFishLightingUniforms[]>([]);
  const uniformsCRef = useRef<VibeFishLightingUniforms[]>([]);
  const modelAvailabilityRef = useRef<[boolean, boolean, boolean]>([true, false, false]);
  const fishAssetStatusRef = useRef<VibeFishAssetStatus>({
    primary: 'loading',
    variants: ['loading', 'loading'],
  });

  useEffect(() => {
    const status = fishAssetStatusRef.current;
    window.__vibe_fishAssetStatus = status;
    return () => {
      if (window.__vibe_fishAssetStatus === status) delete window.__vibe_fishAssetStatus;
    };
  }, []);

  const markModelReady = useCallback((modelIndex: FishModelIndex) => {
    const status = fishAssetStatusRef.current;
    if (modelIndex === 0) {
      status.primary = 'ready';
      setPrimaryReady(true);
    } else {
      status.variants[modelIndex - 1] = 'ready';
      if (modelIndex === 1) setVariantOneSettled(true);
    }
    modelAvailabilityRef.current[modelIndex] = true;
  }, []);
  const markVariantError = useCallback((modelIndex: 1 | 2) => {
    fishAssetStatusRef.current.variants[modelIndex - 1] = 'error';
    if (modelIndex === 1) setVariantOneSettled(true);
  }, []);
  const markPrimaryReady = useCallback(() => markModelReady(0), [markModelReady]);
  const markVariantOneReady = useCallback(() => markModelReady(1), [markModelReady]);
  const markVariantTwoReady = useCallback(() => markModelReady(2), [markModelReady]);
  const markVariantOneError = useCallback(() => markVariantError(1), [markVariantError]);
  const markVariantTwoError = useCallback(() => markVariantError(2), [markVariantError]);

  const renderState = useMemo(() => createFishRenderState(), []);
  const frameContext = useMemo<FishRenderInstanceContext>(
    () => ({
      state: renderState,
      meshes: [null, null, null],
      available: modelAvailabilityRef.current,
      adaptiveEnabled: false,
      instanceUpdateBudget: 128,
      delta: 0,
    }),
    [renderState]
  );

  useEffect(() => {
    return () => {
      resetFishRenderState(renderState);
      clearFishRenderStatus();
    };
  }, [renderState]);

  useFrame((_, delta) => {
    const meshA = meshRefA.current;
    const meshB = meshRefB.current;
    const meshC = meshRefC.current;
    const pocEnabled =
      !!adaptiveInstanceUpdatesEnabled &&
      (typeof window === 'undefined' || window.__vibe_poc_enabled !== false);
    const dbg = typeof window !== 'undefined' ? window.__vibe_debug : undefined;
    const timingEnabled = Boolean(dbg);
    const frameStart = timingEnabled ? performance.now() : 0;

    frameContext.meshes[0] = meshA;
    frameContext.meshes[1] = meshB;
    frameContext.meshes[2] = meshC;
    frameContext.adaptiveEnabled = pocEnabled;
    frameContext.instanceUpdateBudget = useQualityStore.getState().instanceUpdateBudget || 128;
    frameContext.delta = delta;
    const result = updateFishInstances(frameContext);

    const time = renderState.elapsedTime;
    const uniformsA = uniformsARef.current;
    const uniformsB = uniformsBRef.current;
    const uniformsC = uniformsCRef.current;
    for (let i = 0; i < uniformsA.length; i++) uniformsA[i]!.vibeTime.value = time;
    for (let i = 0; i < uniformsB.length; i++) uniformsB[i]!.vibeTime.value = time;
    for (let i = 0; i < uniformsC.length; i++) uniformsC[i]!.vibeTime.value = time;

    let frameDuration = 0;
    if (timingEnabled) {
      frameDuration = performance.now() - frameStart;
      renderState.instanceUpdateEma = recordFishRenderTiming(
        renderState.instanceUpdateEma,
        frameDuration
      );
    }

    const status = renderState.renderStatus;
    status.updateFreq = renderState.updateFrequency;
    status.ema = renderState.instanceUpdateEma || 0;
    status.activeEntities = result.activeEntities;
    status.frameDuration = frameDuration;
    publishFishRenderStatus(
      status,
      dbg,
      pocEnabled && dbg
        ? {
            frame: renderState.frameId,
            duration: frameDuration,
            counts: { countA: result.countA, countB: result.countB, countC: result.countC },
            activeEntities: result.activeEntities,
            ema: renderState.instanceUpdateEma || 0,
            flushed: result.flushed,
          }
        : undefined
    );
  });

  return (
    <>
      <FishModelMesh
        modelIndex={0}
        gltf={gltfA}
        meshRef={meshRefA}
        uniformsRef={uniformsARef}
        fishRimLightingEnabled={fishRimLightingEnabled}
        fishSubsurfaceScatteringEnabled={fishSubsurfaceScatteringEnabled}
        isWebGPU={isWebGPU}
        onReady={markPrimaryReady}
      />
      {primaryReady && (
        <DeferredFishModelSlot
          modelIndex={1}
          meshRef={meshRefB}
          uniformsRef={uniformsBRef}
          fishRimLightingEnabled={fishRimLightingEnabled}
          fishSubsurfaceScatteringEnabled={fishSubsurfaceScatteringEnabled}
          isWebGPU={isWebGPU}
          onReady={markVariantOneReady}
          onError={markVariantOneError}
        />
      )}
      {variantOneSettled && (
        <DeferredFishModelSlot
          modelIndex={2}
          meshRef={meshRefC}
          uniformsRef={uniformsCRef}
          fishRimLightingEnabled={fishRimLightingEnabled}
          fishSubsurfaceScatteringEnabled={fishSubsurfaceScatteringEnabled}
          isWebGPU={isWebGPU}
          onReady={markVariantTwoReady}
          onError={markVariantTwoError}
        />
      )}
    </>
  );
};
