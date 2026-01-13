import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Object3D, InstancedMesh, Vector3, Quaternion } from 'three';
import { world } from '../store';
import type { Entity } from '../store';

import { useVisualQuality } from '../performance/VisualQualityContext';

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

const fishEntitiesQuery = world.with('isFish', 'position', 'velocity');

export const FishRenderSystem = () => {
  const { fishRimLightingEnabled, fishSubsurfaceScatteringEnabled } = useVisualQuality();

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
  }, [gltfA.scene, gltfB.scene, gltfC.scene]);

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

  const quaternionFreeListRef = useRef<Int32Array | null>(null);
  if (quaternionFreeListRef.current === null) {
    const list = new Int32Array(QUATERNION_POOL_SIZE);
    for (let i = 0; i < QUATERNION_POOL_SIZE; i++) list[i] = i;
    quaternionFreeListRef.current = list;
  }

  const quaternionFreeTop = useRef(QUATERNION_POOL_SIZE);

  useEffect(() => {
    return () => {
      const activeEntities = activeEntitiesRef.current;
      const prevEntities = prevEntitiesRef.current;
      const quaternionFreeList = quaternionFreeListRef.current!;

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

  useFrame(() => {
    frameId.current++;
    if (!meshRefA.current || !meshRefB.current || !meshRefC.current) return;

    const quaternionFreeList = quaternionFreeListRef.current!;

    const activeEntities = activeEntitiesRef.current;
    const prevEntities = prevEntitiesRef.current;
    activeEntities.length = 0;

    let countA = 0;
    let countB = 0;
    let countC = 0;

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
      const mesh =
        modelIndex === 0
          ? meshRefA.current!
          : modelIndex === 1
            ? meshRefB.current!
            : meshRefC.current!;
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

      mesh.setMatrixAt(idx, tempObj.matrix);
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

    // Update counts and flag instance buffer updates
    meshRefA.current.count = Math.min(countA, MAX_INSTANCES_PER_MODEL);
    meshRefB.current.count = Math.min(countB, MAX_INSTANCES_PER_MODEL);
    meshRefC.current.count = Math.min(countC, MAX_INSTANCES_PER_MODEL);
    meshRefA.current.instanceMatrix.needsUpdate = true;
    meshRefB.current.instanceMatrix.needsUpdate = true;
    meshRefC.current.instanceMatrix.needsUpdate = true;
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
