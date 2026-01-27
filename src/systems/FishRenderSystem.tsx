import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Object3D, InstancedMesh, Vector3, Quaternion } from 'three';
import { world } from '../store';
import type { Entity } from '../store';

import { useVisualQuality } from '../performance/VisualQualityContext';
import { useQualityStore } from '../performance/qualityStore';

import { MODEL_URLS, extractModelAssets } from './fishModels';
import {
  DEFAULT_VIBE_FISH_RIM_STRENGTH,
  DEFAULT_VIBE_FISH_SSS_STRENGTH,
  enhanceFishMaterialWithRimAndSSS,
  type VibeFishLightingUniforms,
} from '../shaders/fishLightingMaterial';

const MAX_INSTANCES_PER_MODEL = 1000;
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

export const FishRenderSystem = () => {
  const {
    fishRimLightingEnabled,
    fishSubsurfaceScatteringEnabled,
    adaptiveInstanceUpdatesEnabled,
    isWebGPU,
  } = useVisualQuality();

  // Load GLTF scenes
  const gltfA = useGLTF(MODEL_URLS[0]);
  const gltfB = useGLTF(MODEL_URLS[1]);
  const gltfC = useGLTF(MODEL_URLS[2]);

  const meshRefA = useRef<InstancedMesh>(null);
  const meshRefB = useRef<InstancedMesh>(null);
  const meshRefC = useRef<InstancedMesh>(null);

  // Extract geometry/material for each model (use first mesh found)

  const {
    geometryA,
    materialA,
    uniformsA,
    geometryB,
    materialB,
    uniformsB,
    geometryC,
    materialC,
    uniformsC,
  } = useMemo(() => {
    const a = extractModelAssets(gltfA.scene);
    const b = extractModelAssets(gltfB.scene);
    const c = extractModelAssets(gltfC.scene);

    // Provide graceful fallback instead of throwing so app remains stable in production
    function fallback(index: number) {
      console.warn(
        `FishRenderSystem: Missing geometry/material for model #${index}, using fallback box mesh`
      );
      return {
        geo: new THREE.BoxGeometry(0.5, 0.2, 0.1),
        mat: new THREE.MeshStandardMaterial({ color: 0xff00ff }),
      };
    }

    const aResolved = a.geo ? a : fallback(0);
    const bResolved = b.geo ? b : fallback(1);
    const cResolved = c.geo ? c : fallback(2);

    // Skip material enhancement on WebGPU (incompatible with onBeforeCompile injection)
    if (isWebGPU) {
      return {
        geometryA: aResolved.geo!,
        materialA: aResolved.mat!,
        uniformsA: [],
        geometryB: bResolved.geo!,
        materialB: bResolved.mat!,
        uniformsB: [],
        geometryC: cResolved.geo!,
        materialC: cResolved.mat!,
        uniformsC: [],
      };
    }

    const aEnhanced = enhanceFishMaterialWithRimAndSSS(aResolved.mat!);
    const bEnhanced = enhanceFishMaterialWithRimAndSSS(bResolved.mat!);
    const cEnhanced = enhanceFishMaterialWithRimAndSSS(cResolved.mat!);

    const normalizeUniforms = (
      u: VibeFishLightingUniforms | VibeFishLightingUniforms[]
    ): VibeFishLightingUniforms[] => (Array.isArray(u) ? u : [u]);

    return {
      geometryA: aResolved.geo!,
      materialA: aEnhanced.material,
      uniformsA: normalizeUniforms(aEnhanced.uniforms),
      geometryB: bResolved.geo!,
      materialB: bEnhanced.material,
      uniformsB: normalizeUniforms(bEnhanced.uniforms),
      geometryC: cResolved.geo!,
      materialC: cEnhanced.material,
      uniformsC: normalizeUniforms(cEnhanced.uniforms),
    };
  }, [gltfA.scene, gltfB.scene, gltfC.scene, isWebGPU]);

  useEffect(() => {
    const rimStrength = fishRimLightingEnabled ? DEFAULT_VIBE_FISH_RIM_STRENGTH : 0;
    const sssStrength = fishSubsurfaceScatteringEnabled ? DEFAULT_VIBE_FISH_SSS_STRENGTH : 0;

    const apply = (u: VibeFishLightingUniforms) => {
      u.vibeRimStrength.value = rimStrength;
      u.vibeSSSStrength.value = sssStrength;
    };

    for (const u of uniformsA) apply(u);
    for (const u of uniformsB) apply(u);
    for (const u of uniformsC) apply(u);
  }, [fishRimLightingEnabled, fishSubsurfaceScatteringEnabled, uniformsA, uniformsB, uniformsC]);

  const frameId = useRef(0);

  // Per-entity bookkeeping is stored directly on the entity to avoid Map iterator
  // allocations in the useFrame hot path.
  const activeEntitiesRef = useRef<Entity[]>([]);
  const prevEntitiesRef = useRef<Entity[]>([]);

  // Preallocated quaternion pool + free-list (no allocations in useFrame hot path)
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

      // Release any in-flight entities and scrub bookkeeping fields.
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

      // Reset pool bookkeeping for clean remounts.
      quaternionFreeTop.current = QUATERNION_POOL_SIZE;
      for (let i = 0; i < QUATERNION_POOL_SIZE; i++) quaternionFreeList[i] = i;
    };
  }, []);

  // Adaptive instance update controls (PoC)
  const instanceUpdateEmaRef = useRef<number>(0);
  const updateFrequencyRef = useRef<number>(1); // 1 = every frame, 2 = every other frame, etc.

  // Chunked update data structures (mutable via refs)
  const matrixPoolARef = useRef(createMatrixPool());
  const matrixPoolBRef = useRef(createMatrixPool());
  const matrixPoolCRef = useRef(createMatrixPool());
  const dirtyARef = useRef(new Uint8Array(MAX_INSTANCES_PER_MODEL));
  const dirtyBRef = useRef(new Uint8Array(MAX_INSTANCES_PER_MODEL));
  const dirtyCRef = useRef(new Uint8Array(MAX_INSTANCES_PER_MODEL));
  const nextFlushARef = useRef<number>(0);
  const nextFlushBRef = useRef<number>(0);
  const nextFlushCRef = useRef<number>(0);

  useFrame(() => {
    const frameStart = performance.now();
    frameId.current++;
    if (!meshRefA.current || !meshRefB.current || !meshRefC.current) return;

    const pocEnabledFromFlag = !!adaptiveInstanceUpdatesEnabled;
    const pocEnabledFromWindow =
      typeof window !== 'undefined' ? window.__vibe_poc_enabled !== false : true;
    const pocEnabled = pocEnabledFromFlag && pocEnabledFromWindow;

    const quaternionFreeList = quaternionFreeListRef.current!;

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
    for (let i = 0, len = fishEntities.length; i < len; i++) {
      const entity = fishEntities[i]!;
      if (!entity.position) continue;
      entity.__vibeFishSeenFrame = frameId.current;
      activeEntities.push(entity);

      // Assign model index to the entity if it doesn't already have one
      // We store it directly on the entity as `modelIndex` (0, 1, or 2) for simplicity
      let modelIndex: 0 | 1 | 2 | undefined = entity.modelIndex;
      if (modelIndex === undefined || (modelIndex !== 0 && modelIndex !== 1 && modelIndex !== 2)) {
        // Randomize across three models evenly
        modelIndex = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        entity.modelIndex = modelIndex;
      }

      // Choose which mesh and count to use
      const idx = modelIndex === 0 ? countA++ : modelIndex === 1 ? countB++ : countC++;

      if (idx >= MAX_INSTANCES_PER_MODEL) {
        // Entity is active/seen, but won't be rendered this frame due to per-model cap.
        // Ensure it's NOT marked as rendered this frame so sweep can reclaim its quaternion.
        entity.__vibeFishRenderedFrame = undefined;
        continue;
      }

      entity.__vibeFishRenderedFrame = frameId.current;

      tempObj.position.copy(entity.position);

      // Rotation smoothing per-entity
      let quaternionIndex = entity.__vibeFishQuatIndex;
      if (typeof quaternionIndex !== 'number') quaternionIndex = undefined;

      if (quaternionIndex === undefined) {
        if (quaternionFreeTop.current > 0) {
          quaternionIndex = quaternionFreeList[--quaternionFreeTop.current]!;
        } else {
          quaternionIndex = -1;
        }
        entity.__vibeFishQuatIndex = quaternionIndex;
      }

      const prev = quaternionIndex >= 0 ? quaternionPool[quaternionIndex]! : quaternionFallback;

      if (entity.velocity && entity.velocity.lengthSq() > 0.01) {
        tempVec.copy(entity.velocity).normalize();
        tempQuat.setFromUnitVectors(FORWARD, tempVec);
        prev.slerp(tempQuat, 0.1);
        tempObj.quaternion.copy(prev);
      } else {
        tempObj.quaternion.copy(prev);
      }

      tempObj.scale.setScalar(0.3);
      tempObj.updateMatrix();

      // Record matrix into per-model pool and mark dirty for chunked flush
      if (modelIndex === 0) {
        matrixPoolARef.current[idx]!.copy(tempObj.matrix);
        if (pocEnabled) {
          dirtyARef.current[idx] = 1;
        } else {
          meshRefA.current.setMatrixAt(idx, tempObj.matrix);
          wroteA = true;
        }
      } else if (modelIndex === 1) {
        matrixPoolBRef.current[idx]!.copy(tempObj.matrix);
        if (pocEnabled) {
          dirtyBRef.current[idx] = 1;
        } else {
          meshRefB.current.setMatrixAt(idx, tempObj.matrix);
          wroteB = true;
        }
      } else {
        matrixPoolCRef.current[idx]!.copy(tempObj.matrix);
        if (pocEnabled) {
          dirtyCRef.current[idx] = 1;
        } else {
          meshRefC.current.setMatrixAt(idx, tempObj.matrix);
          wroteC = true;
        }
      }
    }

    // Cleanup: sweep entities that were active last frame but not seen this frame.
    for (let i = 0; i < prevEntities.length; i++) {
      const entity = prevEntities[i]!;
      if (entity.__vibeFishSeenFrame !== frameId.current) {
        // Entity no longer active; release quaternion and clear all bookkeeping.
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
        entity.__vibeFishSeenFrame = undefined;
        entity.__vibeFishRenderedFrame = undefined;
        continue;
      }

      if (entity.__vibeFishRenderedFrame !== frameId.current) {
        // Entity is still active/seen, but wasn't rendered this frame (cap). Reclaim quaternion.
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
      }
    }

    // Release references in the previous list before reusing it.
    prevEntities.length = 0;

    // Swap active/prev arrays (reusing the arrays; do not allocate).
    const tmp = prevEntitiesRef.current;
    prevEntitiesRef.current = activeEntitiesRef.current;
    activeEntitiesRef.current = tmp;

    // Update counts
    meshRefA.current.count = Math.min(countA, MAX_INSTANCES_PER_MODEL);
    meshRefB.current.count = Math.min(countB, MAX_INSTANCES_PER_MODEL);
    meshRefC.current.count = Math.min(countC, MAX_INSTANCES_PER_MODEL);

    // Adaptive instanceMatrix update frequency
    try {
      const frameEnd = performance.now();
      const frameDuration = frameEnd - frameStart;

      // EMA for frame duration
      const alpha = 0.06;
      instanceUpdateEmaRef.current = instanceUpdateEmaRef.current
        ? instanceUpdateEmaRef.current + (frameDuration - instanceUpdateEmaRef.current) * alpha
        : frameDuration;

      const ema = instanceUpdateEmaRef.current;

      if (pocEnabled) {
        // Chunked flush
        // Budget derived from quality store (default fallback 128)
        const TOTAL_BUDGET = useQualityStore.getState().instanceUpdateBudget || 128;

        const flushModel = (mesh: InstancedMesh | null, pool: THREE.Matrix4[], dirty: Uint8Array, nextRef: React.MutableRefObject<number>, count: number, perModelBudget: number) => {
          if (!mesh || count <= 0) return 0;
          const meshCount = Math.min(count, MAX_INSTANCES_PER_MODEL);
          let flushed = 0;
          let scanned = 0;
          let idx = nextRef.current % meshCount;

          while (flushed < perModelBudget && scanned < meshCount) {
            if (dirty[idx]) {
              mesh.setMatrixAt(idx, pool[idx]);
              dirty[idx] = 0;
              flushed++;
            }
            idx = (idx + 1) % meshCount;
            scanned++;
          }

          nextRef.current = idx;
          if (flushed > 0) mesh.instanceMatrix.needsUpdate = true;
          return flushed;
        };

        const perModel = Math.ceil(TOTAL_BUDGET / 3);
        const flushedA = flushModel(meshRefA.current, matrixPoolARef.current, dirtyARef.current, nextFlushARef, meshRefA.current.count, perModel);
        const flushedB = flushModel(meshRefB.current, matrixPoolBRef.current, dirtyBRef.current, nextFlushBRef, meshRefB.current.count, perModel);
        const flushedC = flushModel(meshRefC.current, matrixPoolCRef.current, dirtyCRef.current, nextFlushCRef, meshRefC.current.count, perModel);

        const dbg = window.__vibe_debug;
        if (dbg) dbg.fishRender.push({ frame: frameId.current, duration: frameDuration, counts: { countA, countB, countC }, activeEntities: activeEntities.length, ema, flushed: flushedA + flushedB + flushedC });
      } else {
        // PoC disabled: matrices were written directly in the loop above.
        if (wroteA) meshRefA.current.instanceMatrix.needsUpdate = true;
        if (wroteB) meshRefB.current.instanceMatrix.needsUpdate = true;
        if (wroteC) meshRefC.current.instanceMatrix.needsUpdate = true;
      }

      // Lightweight per-frame status for external sampling
      try {
        window.__vibe_renderStatus = {
          updateFreq: updateFrequencyRef.current,
          ema: instanceUpdateEmaRef.current || 0,
          activeEntities: activeEntities.length,
          frameDuration,
        };
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  });

  return (
    <>
      <instancedMesh
        ref={meshRefA}
        args={[geometryA!, materialA!, MAX_INSTANCES_PER_MODEL]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      <instancedMesh
        ref={meshRefB}
        args={[geometryB!, materialB!, MAX_INSTANCES_PER_MODEL]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      <instancedMesh
        ref={meshRefC}
        args={[geometryC!, materialC!, MAX_INSTANCES_PER_MODEL]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
    </>
  );
};
