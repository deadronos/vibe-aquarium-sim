import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Object3D, InstancedMesh, Vector3, Quaternion } from 'three';
import { world } from '../store';
import fishUrl from '../assets/gltf/CopilotClownFish.glb?url';

const MAX_INSTANCES = 1000;
const tempObj = new Object3D();
const tempVec = new Vector3();
const tempQuat = new Quaternion();
const FORWARD = new Vector3(0, 0, 1);

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

        if (!geo) throw new Error("Could not find geometry in Fish GLTF");
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

        const fishEntities = world.with('isFish', 'position', 'velocity');
        let count = 0;

        // Smoothness factor for interpolation (if we had previous state, but we're reading direct ECS pos)
        // Actually, ECS positions are updated by physics which runs at fixed step.
        // For now, we render at current ECS position. 
        // Ideally we'd interpolate between physics states, but reading 'position' is fine for v1.

        // Position Interpolation note:
        // The previous Fish.tsx had: modelRef.current.position.lerp(entity.position, lerpFactor)
        // To replicate that strictly in Instancing is harder (need to store visualization state per instance).
        // Better: Just use the ECS position directly. It might be slightly jittery if physics < FPS, 
        // but Rapier usually interpolates if configured, or we can add interpolation later.
        // We will stick to simple "Set transform to entity.position" for now.

        for (const entity of fishEntities) {
            if (count >= MAX_INSTANCES) break;
            if (!entity.position) continue;

            tempObj.position.copy(entity.position);

            // Orientation based on velocity
            if (entity.velocity && entity.velocity.lengthSq() > 0.01) {
                tempVec.copy(entity.velocity).normalize();
                tempQuat.setFromUnitVectors(FORWARD, tempVec);
                // Slerp for smoothness? 
                // We can't easily slerp without storing previous rotation per instance.
                // Direct set for now.
                tempObj.quaternion.copy(tempQuat);
            } else {
                // Default or previous quaternion? 
                // Defaulting to identity might snap weirdly. 
                // Ideally we keep rotation if velocity is zero.
                // For now, let's just leave it (tempObj retains last mutation? No, it's shared).
                tempObj.quaternion.identity();
            }

            tempObj.scale.setScalar(0.3);
            tempObj.updateMatrix();

            meshRef.current.setMatrixAt(count, tempObj.matrix);
            count++;
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
