import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { InstancedMesh, Object3D, Quaternion, Vector3 } from 'three';
import { world } from '../store';
import type { Entity } from '../store';
import { useVisualQuality } from '../performance/VisualQualityContext';
import { useQualityStore } from '../performance/qualityStore';
import { flushDirtyInstanceMatrices } from './fishRenderFlush';
import { MAX_INSTANCES_PER_MODEL, warnInstanceCap } from './instanceCapWarning';
import { MODEL_URLS, resolveFishModelIndex, type FishModelIndex } from './fishModels';
import { FishModelErrorBoundary, FishModelMesh } from './FishModelMesh';
import type { VibeFishLightingUniforms } from '../shaders/fishLightingMaterial';

const QUATERNION_POOL_SIZE = MAX_INSTANCES_PER_MODEL * 3;
const tempObj = new Object3D();
const tempVec = new Vector3();
const tempQuat = new Quaternion();
const FORWARD = new Vector3(0, 0, 1);

function createMatrixPool() {
  const pool: THREE.Matrix4[] = new Array(MAX_INSTANCES_PER_MODEL);
  for (let i = 0; i < MAX_INSTANCES_PER_MODEL; i++) pool[i] = new THREE.Matrix4();
  return pool;
}

function createQuaternionFreeList() {
  const list = new Int32Array(QUATERNION_POOL_SIZE);
  for (let i = 0; i < QUATERNION_POOL_SIZE; i++) list[i] = i;
  return list;
}

const fishEntitiesQuery = world.with('isFish', 'position', 'velocity');

type DeferredFishModelProps = {
  modelIndex: 1 | 2;
  meshRef: React.MutableRefObject<InstancedMesh | null>;
  uniformsRef: React.MutableRefObject<VibeFishLightingUniforms[]>;
  fishRimLightingEnabled: boolean;
  fishSubsurfaceScatteringEnabled: boolean;
  isWebGPU: boolean;
  onReady: () => void;
};

const DeferredFishModel = ({ modelIndex, ...props }: DeferredFishModelProps) => {
  const gltf = useGLTF(MODEL_URLS[modelIndex]);
  return <FishModelMesh modelIndex={modelIndex} gltf={gltf} {...props} />;
};

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

  const frameId = useRef(0);
  const elapsedTimeRef = useRef(0);
  const activeEntitiesRef = useRef<Entity[]>([]);
  const prevEntitiesRef = useRef<Entity[]>([]);
  const quaternionPool = useMemo(() => {
    const pool: Quaternion[] = new Array(QUATERNION_POOL_SIZE);
    for (let i = 0; i < QUATERNION_POOL_SIZE; i++) pool[i] = new Quaternion();
    return pool;
  }, []);
  const quaternionFallback = useMemo(() => new Quaternion(), []);
  const quaternionFreeListRef = useRef<Int32Array>(createQuaternionFreeList());
  const quaternionFreeTop = useRef(QUATERNION_POOL_SIZE);

  useEffect(() => {
    const quaternionFreeList = quaternionFreeListRef.current;
    return () => {
      const activeEntities = activeEntitiesRef.current;
      const prevEntities = prevEntitiesRef.current;
      for (let i = 0; i < activeEntities.length; i++) {
        const entity = activeEntities[i]!;
        entity.__vibeFishQuatIndex = undefined;
        entity.__vibeFishSeenFrame = undefined;
        entity.__vibeFishRenderedFrame = undefined;
      }
      for (let i = 0; i < prevEntities.length; i++) {
        const entity = prevEntities[i]!;
        entity.__vibeFishQuatIndex = undefined;
        entity.__vibeFishSeenFrame = undefined;
        entity.__vibeFishRenderedFrame = undefined;
      }
      activeEntities.length = 0;
      prevEntities.length = 0;
      quaternionFreeTop.current = QUATERNION_POOL_SIZE;
      for (let i = 0; i < QUATERNION_POOL_SIZE; i++) quaternionFreeList[i] = i;
    };
  }, []);

  const instanceUpdateEmaRef = useRef(0);
  const updateFrequencyRef = useRef(1);
  const renderStatusRef = useRef({ updateFreq: 1, ema: 0, activeEntities: 0, frameDuration: 0 });
  const matrixPoolARef = useRef(createMatrixPool());
  const matrixPoolBRef = useRef(createMatrixPool());
  const matrixPoolCRef = useRef(createMatrixPool());
  const dirtyARef = useRef(new Uint8Array(MAX_INSTANCES_PER_MODEL));
  const dirtyBRef = useRef(new Uint8Array(MAX_INSTANCES_PER_MODEL));
  const dirtyCRef = useRef(new Uint8Array(MAX_INSTANCES_PER_MODEL));
  const nextFlushARef = useRef(0);
  const nextFlushBRef = useRef(0);
  const nextFlushCRef = useRef(0);

  useFrame((_, delta) => {
    elapsedTimeRef.current += delta;
    const time = elapsedTimeRef.current;
    const uniformsA = uniformsARef.current;
    const uniformsB = uniformsBRef.current;
    const uniformsC = uniformsCRef.current;
    for (let i = 0; i < uniformsA.length; i++) uniformsA[i]!.vibeTime.value = time;
    for (let i = 0; i < uniformsB.length; i++) uniformsB[i]!.vibeTime.value = time;
    for (let i = 0; i < uniformsC.length; i++) uniformsC[i]!.vibeTime.value = time;
    frameId.current++;
    const meshA = meshRefA.current;
    if (!meshA) return;
    const meshB = meshRefB.current;
    const meshC = meshRefC.current;
    const pocEnabled =
      !!adaptiveInstanceUpdatesEnabled &&
      (typeof window === 'undefined' || window.__vibe_poc_enabled !== false);
    const dbg = typeof window !== 'undefined' ? window.__vibe_debug : undefined;
    const timingEnabled = Boolean(dbg);
    const frameStart = timingEnabled ? performance.now() : 0;
    const quaternionFreeList = quaternionFreeListRef.current;
    const activeEntities = activeEntitiesRef.current;
    const prevEntities = prevEntitiesRef.current;
    activeEntities.length = 0;
    let countA = 0;
    let countB = 0;
    let countC = 0;
    let wroteA = false;
    let wroteB = false;
    let wroteC = false;
    const fishEntities = fishEntitiesQuery.entities;
    const available = modelAvailabilityRef.current;

    for (let i = 0, len = fishEntities.length; i < len; i++) {
      const entity = fishEntities[i]!;
      if (!entity.position) continue;
      entity.__vibeFishSeenFrame = frameId.current;
      activeEntities.push(entity);
      let modelIndex = resolveFishModelIndex(entity.modelIndex ?? Number.NaN, available);
      if ((modelIndex === 1 && !meshB) || (modelIndex === 2 && !meshC)) modelIndex = 0;
      const idx = modelIndex === 0 ? countA++ : modelIndex === 1 ? countB++ : countC++;
      if (idx >= MAX_INSTANCES_PER_MODEL) {
        entity.__vibeFishRenderedFrame = undefined;
        warnInstanceCap(modelIndex, fishEntities.length);
        continue;
      }
      entity.__vibeFishRenderedFrame = frameId.current;
      tempObj.position.copy(entity.position);
      let quaternionIndex = entity.__vibeFishQuatIndex;
      if (typeof quaternionIndex !== 'number') quaternionIndex = undefined;
      if (quaternionIndex === undefined) {
        quaternionIndex =
          quaternionFreeTop.current > 0 ? quaternionFreeList[--quaternionFreeTop.current]! : -1;
        entity.__vibeFishQuatIndex = quaternionIndex;
      }
      const previous = quaternionIndex >= 0 ? quaternionPool[quaternionIndex]! : quaternionFallback;
      if (entity.velocity && entity.velocity.lengthSq() > 0.005) {
        tempVec.copy(entity.velocity).normalize();
        tempQuat.setFromUnitVectors(FORWARD, tempVec);
        previous.slerp(tempQuat, 0.15);
      }
      tempObj.quaternion.copy(previous);
      tempObj.scale.setScalar(0.3);
      tempObj.updateMatrix();
      if (modelIndex === 0) {
        matrixPoolARef.current[idx]!.copy(tempObj.matrix);
        if (pocEnabled) dirtyARef.current[idx] = 1;
        else {
          meshA.setMatrixAt(idx, tempObj.matrix);
          wroteA = true;
        }
      } else if (modelIndex === 1) {
        matrixPoolBRef.current[idx]!.copy(tempObj.matrix);
        if (pocEnabled) dirtyBRef.current[idx] = 1;
        else {
          meshB!.setMatrixAt(idx, tempObj.matrix);
          wroteB = true;
        }
      } else {
        matrixPoolCRef.current[idx]!.copy(tempObj.matrix);
        if (pocEnabled) dirtyCRef.current[idx] = 1;
        else {
          meshC!.setMatrixAt(idx, tempObj.matrix);
          wroteC = true;
        }
      }
    }

    for (let i = 0; i < prevEntities.length; i++) {
      const entity = prevEntities[i]!;
      if (
        entity.__vibeFishSeenFrame === frameId.current &&
        entity.__vibeFishRenderedFrame === frameId.current
      )
        continue;
      const idx = entity.__vibeFishQuatIndex;
      if (
        typeof idx === 'number' &&
        idx >= 0 &&
        idx < QUATERNION_POOL_SIZE &&
        quaternionFreeTop.current < QUATERNION_POOL_SIZE
      ) {
        quaternionFreeList[quaternionFreeTop.current++] = idx;
      }
      entity.__vibeFishQuatIndex = undefined;
      entity.__vibeFishRenderedFrame = undefined;
      if (entity.__vibeFishSeenFrame !== frameId.current) entity.__vibeFishSeenFrame = undefined;
    }
    prevEntities.length = 0;
    const previousEntities = prevEntitiesRef.current;
    prevEntitiesRef.current = activeEntitiesRef.current;
    activeEntitiesRef.current = previousEntities;
    meshA.count = Math.min(countA, MAX_INSTANCES_PER_MODEL);
    if (meshB) meshB.count = Math.min(countB, MAX_INSTANCES_PER_MODEL);
    if (meshC) meshC.count = Math.min(countC, MAX_INSTANCES_PER_MODEL);

    try {
      let frameDuration = 0;
      if (timingEnabled) {
        frameDuration = performance.now() - frameStart;
        const alpha = 0.06;
        instanceUpdateEmaRef.current = instanceUpdateEmaRef.current
          ? instanceUpdateEmaRef.current + (frameDuration - instanceUpdateEmaRef.current) * alpha
          : frameDuration;
      }
      const ema = instanceUpdateEmaRef.current;
      if (pocEnabled) {
        const totalBudget = useQualityStore.getState().instanceUpdateBudget || 128;
        const perModel = Math.ceil(totalBudget / 3);
        const flushedA = flushDirtyInstanceMatrices(
          meshA,
          matrixPoolARef.current,
          dirtyARef.current,
          nextFlushARef,
          meshA.count,
          perModel
        );
        const flushedB = meshB
          ? flushDirtyInstanceMatrices(
              meshB,
              matrixPoolBRef.current,
              dirtyBRef.current,
              nextFlushBRef,
              meshB.count,
              perModel
            )
          : 0;
        const flushedC = meshC
          ? flushDirtyInstanceMatrices(
              meshC,
              matrixPoolCRef.current,
              dirtyCRef.current,
              nextFlushCRef,
              meshC.count,
              perModel
            )
          : 0;
        if (dbg)
          dbg.fishRender.push({
            frame: frameId.current,
            duration: frameDuration,
            counts: { countA, countB, countC },
            activeEntities: activeEntities.length,
            ema,
            flushed: flushedA + flushedB + flushedC,
          });
      } else {
        if (wroteA) meshA.instanceMatrix.needsUpdate = true;
        if (wroteB) meshB!.instanceMatrix.needsUpdate = true;
        if (wroteC) meshC!.instanceMatrix.needsUpdate = true;
      }
      if (dbg) {
        const status = renderStatusRef.current;
        status.updateFreq = updateFrequencyRef.current;
        status.ema = instanceUpdateEmaRef.current || 0;
        status.activeEntities = activeEntities.length;
        status.frameDuration = frameDuration;
        window.__vibe_renderStatus = status;
      } else if (typeof window !== 'undefined' && window.__vibe_renderStatus)
        delete window.__vibe_renderStatus;
    } catch {
      /* Render diagnostics must not interrupt simulation visuals. */
    }
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
        <Suspense fallback={null}>
          <FishModelErrorBoundary modelIndex={1} onError={markVariantOneError}>
            <DeferredFishModel
              modelIndex={1}
              meshRef={meshRefB}
              uniformsRef={uniformsBRef}
              fishRimLightingEnabled={fishRimLightingEnabled}
              fishSubsurfaceScatteringEnabled={fishSubsurfaceScatteringEnabled}
              isWebGPU={isWebGPU}
              onReady={markVariantOneReady}
            />
          </FishModelErrorBoundary>
        </Suspense>
      )}
      {variantOneSettled && (
        <Suspense fallback={null}>
          <FishModelErrorBoundary modelIndex={2} onError={markVariantTwoError}>
            <DeferredFishModel
              modelIndex={2}
              meshRef={meshRefC}
              uniformsRef={uniformsCRef}
              fishRimLightingEnabled={fishRimLightingEnabled}
              fishSubsurfaceScatteringEnabled={fishSubsurfaceScatteringEnabled}
              isWebGPU={isWebGPU}
              onReady={markVariantTwoReady}
            />
          </FishModelErrorBoundary>
        </Suspense>
      )}
    </>
  );
};
