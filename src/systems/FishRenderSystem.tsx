import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Object3D, InstancedMesh, Vector3, Quaternion } from 'three';
import { world } from '../store';
import type { Entity } from '../store';
import fishUrl from '../assets/gltf/CopilotClownFish.glb?url';

const MAX_INSTANCES = 1000;
const tempObj = new Object3D();
const tempVec = new Vector3();
const tempQuat = new Quaternion();
const prevQuat = new Quaternion();
const FORWARD = new Vector3(0, 0, 1);

// Per-instance rotation storage: [x, y, z, w] per instance
const instanceQuaternions = new Float32Array(MAX_INSTANCES * 4);
// Initialize all to identity quaternion (0, 0, 0, 1)
for (let i = 0; i < MAX_INSTANCES; i++) {
  instanceQuaternions[i * 4 + 3] = 1; // w component
}

// Stable entity-to-index mapping with free-list recycling
let nextIndex = 0;
const freeIndices: number[] = [];
const entityToIndex = new Map<Entity, number>();
const entityLastSeenFrame = new Map<Entity, number>();
let frameId = 0;

const fishEntitiesQuery = world.with('isFish', 'position', 'velocity');

export const FishRenderSystem = () => {
  const { scene } = useGLTF(fishUrl);
  const meshRef = useRef<InstancedMesh>(null);

  // Extract the geometry and material from the GLTF
  // Assumes the GLTF has a single mesh or we merge them.
  // The provided fish GLTF usually has a few child meshes.
  // For simplicity, we'll try to find the first Mesh and use its Geometry/Material.
  // If there are multiple meshes, we might need multiple InstancedMeshes or merge them.
  const { geometry, material } = useMemo(() => {
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

    if (!geo) throw new Error('Could not find geometry in Fish GLTF');
    return { geometry: geo, material: mat };
  }, [scene]);

  // Map Entity ID -> Instance Index
  // For a simple implementation where we just iterate all fish, we can just rebuild
  // the instance mapping every frame or simply rely on query order if it's stable
  // (ECS queries are usually stable-ish, but dangerous for persistent ID mapping).
  // A robust approach: Maintain a Map<Entity, number> and allocate slots.
  // For *this* performance pass, we'll just iterate 0..N every frame for active fish.

  useFrame(() => {
    if (!meshRef.current) return;

    let count = 0;
    frameId++;

    for (const entity of fishEntitiesQuery) {
      if (count >= MAX_INSTANCES) break;
      if (!entity.position) continue;
      entityLastSeenFrame.set(entity, frameId);

      // Get or assign stable instance index for this entity
      // Use free list to avoid "instance index collision" and unbounded growth
      let idx = entityToIndex.get(entity);
      if (idx === undefined) {
        if (freeIndices.length > 0) {
          idx = freeIndices.pop()!;
        } else {
          // Check bounds to prevent corruption if we exceed MAX_INSTANCES
          if (nextIndex >= MAX_INSTANCES) {
            // Silently skip to prevent console spam and crash
            continue;
          }
          idx = nextIndex++;
        }
        entityToIndex.set(entity, idx);
      }

      tempObj.position.copy(entity.position);

      // Orientation based on velocity with slerp interpolation
      const base = idx * 4;

      if (entity.velocity && entity.velocity.lengthSq() > 0.01) {
        tempVec.copy(entity.velocity).normalize();
        tempQuat.setFromUnitVectors(FORWARD, tempVec);

        // Load previous quaternion from storage
        prevQuat.set(
          instanceQuaternions[base],
          instanceQuaternions[base + 1],
          instanceQuaternions[base + 2],
          instanceQuaternions[base + 3]
        );

        // Slerp towards target (0.1 factor for smoothness)
        prevQuat.slerp(tempQuat, 0.1);
        tempObj.quaternion.copy(prevQuat);

        // Store back to array
        instanceQuaternions[base] = prevQuat.x;
        instanceQuaternions[base + 1] = prevQuat.y;
        instanceQuaternions[base + 2] = prevQuat.z;
        instanceQuaternions[base + 3] = prevQuat.w;
      } else {
        // Keep previous rotation when stationary
        tempObj.quaternion.set(
          instanceQuaternions[base],
          instanceQuaternions[base + 1],
          instanceQuaternions[base + 2],
          instanceQuaternions[base + 3]
        );
      }

      tempObj.scale.setScalar(0.3);
      tempObj.updateMatrix();

      meshRef.current.setMatrixAt(count, tempObj.matrix);
      count++;
    }

    // Cleanup: remove entities no longer active and recycle their indices
    for (const [e, removedIdx] of entityToIndex) {
      if (entityLastSeenFrame.get(e) !== frameId) {
        freeIndices.push(removedIdx);
        entityToIndex.delete(e);
        entityLastSeenFrame.delete(e);
      }
    }

    meshRef.current.count = count;
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry!, material!, MAX_INSTANCES]}
      castShadow
      receiveShadow
      frustumCulled={false} // Avoid culling issues for now
    >
      {/* If material needs configuration, we can wrap it or configure above */}
    </instancedMesh>
  );
};
