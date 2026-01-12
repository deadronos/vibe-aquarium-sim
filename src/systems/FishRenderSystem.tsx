import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Object3D, InstancedMesh, Vector3, Quaternion } from 'three';
import { world } from '../store';
import type { Entity } from '../store';

import { MODEL_URLS, extractModelAssets } from './fishModels';

const MAX_INSTANCES_PER_MODEL = 1000;
const tempObj = new Object3D();
const tempVec = new Vector3();
const tempQuat = new Quaternion();
const FORWARD = new Vector3(0, 0, 1);

// Stable bookkeeping
const entityLastSeenFrame = new Map<Entity, number>();
let frameId = 0;

const fishEntitiesQuery = world.with('isFish', 'position', 'velocity');


export const FishRenderSystem = () => {
  // Load GLTF scenes
  const gltfA = useGLTF(MODEL_URLS[0]);
  const gltfB = useGLTF(MODEL_URLS[1]);
  const gltfC = useGLTF(MODEL_URLS[2]);

  const meshRefA = useRef<InstancedMesh>(null);
  const meshRefB = useRef<InstancedMesh>(null);
  const meshRefC = useRef<InstancedMesh>(null);

  // Extract geometry/material for each model (use first mesh found)

  const { geometryA, materialA, geometryB, materialB, geometryC, materialC } = useMemo(() => {
    const a = extractModelAssets(gltfA.scene);
    const b = extractModelAssets(gltfB.scene);
    const c = extractModelAssets(gltfC.scene);

    // Provide graceful fallback instead of throwing so app remains stable in production
    function fallback(index: number) {
      console.warn(`FishRenderSystem: Missing geometry/material for model #${index}, using fallback box mesh`);
      return { geo: new THREE.BoxGeometry(0.5, 0.2, 0.1), mat: new THREE.MeshStandardMaterial({ color: 0xff00ff }) };
    }

    const aResolved = a.geo ? a : fallback(0);
    const bResolved = b.geo ? b : fallback(1);
    const cResolved = c.geo ? c : fallback(2);

    return {
      geometryA: aResolved.geo!,
      materialA: aResolved.mat!,
      geometryB: bResolved.geo!,
      materialB: bResolved.mat!,
      geometryC: cResolved.geo!,
      materialC: cResolved.mat!,
    };
  }, [gltfA.scene, gltfB.scene, gltfC.scene]);

  // Per-entity rotation quaternion cache (keeps stable orientation smoothing)
  const entityQuaternions = useRef(new Map<Entity, Quaternion>()).current;

  useFrame(() => {
    frameId++;
    if (!meshRefA.current || !meshRefB.current || !meshRefC.current) return;

    let countA = 0;
    let countB = 0;
    let countC = 0;

    for (const entity of fishEntitiesQuery) {
      if (!entity.position) continue;
      entityLastSeenFrame.set(entity, frameId);

      // Assign model index to the entity if it doesn't already have one
      // We store it directly on the entity as `modelIndex` (0, 1, or 2) for simplicity
      let modelIndex: number | undefined = entity.modelIndex;
      if (![0, 1, 2].includes(modelIndex as number)) {
        // Randomize across three models evenly
        modelIndex = Math.floor(Math.random() * 3);
        entity.modelIndex = modelIndex;
      }

      // Choose which mesh and count to use
      const mesh = modelIndex === 0 ? meshRefA.current! : modelIndex === 1 ? meshRefB.current! : meshRefC.current!;
      const idx = modelIndex === 0 ? countA++ : modelIndex === 1 ? countB++ : countC++;

      tempObj.position.copy(entity.position);

      // Rotation smoothing per-entity
      let prev = entityQuaternions.get(entity);
      if (!prev) {
        prev = new Quaternion();
        entityQuaternions.set(entity, prev);
      }

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

    // Cleanup: remove entities no longer active and their cached quaternions
    for (const e of entityQuaternions.keys()) {
      if (entityLastSeenFrame.get(e) !== frameId) {
        entityQuaternions.delete(e);
        entityLastSeenFrame.delete(e);
      }
    }

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
