import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Object3D, InstancedMesh, Vector3, Quaternion } from 'three';
import { world } from '../store';
import type { Entity } from '../store';

// We'll load both GLBs from the public folder so authors can drop models there.
const MODEL_URLS = ['/Copilot3D-fish.glb', '/Copilot3D-fish2.glb'];

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
  // Load both gltf scenes
  const gltfA = useGLTF(MODEL_URLS[0]);
  const gltfB = useGLTF(MODEL_URLS[1]);

  const meshRefA = useRef<InstancedMesh>(null);
  const meshRefB = useRef<InstancedMesh>(null);

  // Extract geometry/material for each model (use first mesh found)
  const { geometryA, materialA, geometryB, materialB } = useMemo(() => {
    function extract(scene: THREE.Object3D) {
      let geo: THREE.BufferGeometry | null = null;
      let mat: THREE.Material | THREE.Material[] | null = null;
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          if (!geo) {
            geo = (child as THREE.Mesh).geometry.clone();
            mat = (child as THREE.Mesh).material;
          }
        }
      });
      return { geo, mat };
    }

    const a = extract(gltfA.scene);
    const b = extract(gltfB.scene);

    if (!a.geo) throw new Error('Could not find geometry in first Fish GLTF');
    if (!b.geo) throw new Error('Could not find geometry in second Fish GLTF');

    return { geometryA: a.geo, materialA: a.mat, geometryB: b.geo, materialB: b.mat };
  }, [gltfA.scene, gltfB.scene]);

  // Per-entity rotation quaternion cache (keeps stable orientation smoothing)
  const entityQuaternions = useRef(new Map<Entity, Quaternion>()).current;

  useFrame(() => {
    frameId++;
    if (!meshRefA.current || !meshRefB.current) return;

    let countA = 0;
    let countB = 0;

    for (const entity of fishEntitiesQuery) {
      if (!entity.position) continue;
      entityLastSeenFrame.set(entity, frameId);

      // Assign model index to the entity if it doesn't already have one
      // We store it directly on the entity as `modelIndex` (0 or 1) for simplicity
      let modelIndex: number | undefined = entity.modelIndex;
      if (modelIndex !== 0 && modelIndex !== 1) {
        modelIndex = Math.random() < 0.5 ? 0 : 1;
        entity.modelIndex = modelIndex;
      }

      // Choose which mesh and count to use
      const mesh = modelIndex === 0 ? meshRefA.current! : meshRefB.current!;
      const idx = modelIndex === 0 ? countA++ : countB++;

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
    meshRefA.current.instanceMatrix.needsUpdate = true;
    meshRefB.current.instanceMatrix.needsUpdate = true;
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
    </>
  );
};
