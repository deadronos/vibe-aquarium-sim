import { useGLTF } from '@react-three/drei';
import { RigidBody, RapierRigidBody, useBeforePhysicsStep, useAfterPhysicsStep, BallCollider } from '@react-three/rapier';
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { world } from '../store';
import type { Entity } from '../store';
import {
  Vector3,
  Quaternion,
  Group,
  SRGBColorSpace,
  Mesh,
  Material,
  Color,
  Object3D,
  Texture,
} from 'three';
import { applyQueuedForcesToRigidBody } from '../utils/physicsHelpers';
import fishUrl from '../assets/gltf/CopilotClownFish.glb?url';

const tempVec = new Vector3();
const tempQuat = new Quaternion();
const FORWARD = new Vector3(0, 0, 1);

export const Fish = ({ entity }: { entity: Entity }) => {
  const { scene } = useGLTF(fishUrl);
  const rigidBody = useRef<RapierRigidBody>(null);
  const modelRef = useRef<Group>(null);

  // Clone scene and enable shadows + ensure texture color encoding
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child: Object3D) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // If there's a texture map ensure sRGB encoding for correct color
        const material = (child as Mesh).material as Material | Material[] | undefined;
        if (material) {
          // Support both arrays and single material
          const mats = Array.isArray(material) ? material : [material];
          for (const m of mats) {
            type MaterialWithMap = Material & {
              map?: Texture & { colorSpace?: unknown; needsUpdate?: boolean };
              name?: string;
              type?: string;
              color?: Color & {
                getHexString?: () => string;
                lerp?: (c: Color, t: number) => Color;
              };
              needsUpdate?: boolean;
            };

            const mat = m as MaterialWithMap;
            if (mat.map) {
              mat.map.colorSpace = SRGBColorSpace;
              if (typeof mat.map.needsUpdate !== 'undefined') mat.map.needsUpdate = true;
            }
            if (typeof mat.needsUpdate !== 'undefined') mat.needsUpdate = true;
          }
        }
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    return () => {
      if (entity.rigidBodyHandle) {
        world.removeComponent(entity, 'rigidBodyHandle');
      }
    };
  }, [entity]);

  // 1. Apply Forces BEFORE the physics step (Source of Truth: ECS -> Physics)
  useBeforePhysicsStep((rapierWorld) => {
    if (!rigidBody.current) return;

    // Use the physics engine's fixed timestep for consistent force application
    const dt = rapierWorld.timestep;
    applyQueuedForcesToRigidBody(rigidBody.current, entity, dt);
  });

  // 2. Sync Physics -> ECS AFTER the physics step (Source of Truth: Physics -> ECS)
  useAfterPhysicsStep(() => {
    if (!rigidBody.current) return;

    if (!entity.rigidBodyHandle) {
      // store numeric handle only to avoid keeping WASM wrapper objects in ECS
      world.addComponent(entity, 'rigidBodyHandle', rigidBody.current.handle);
    }

    const pos = rigidBody.current.translation();
    const vel = rigidBody.current.linvel();

    if (pos && vel) {
      entity.position?.set(pos.x, pos.y, pos.z);
      entity.velocity?.set(vel.x, vel.y, vel.z);

      // Clamp rigid body position to stay inside tank bounds (X [-2,2], Y [-1,1], Z [-1,1])
      const xLimit = 2.0,
        yLimit = 1.0,
        zLimit = 1.0;
      const margin = 0.05; // small margin inside walls
      let clamped = false;
      const cx = Math.max(-xLimit + margin, Math.min(xLimit - margin, pos.x));
      const cy = Math.max(-yLimit + margin, Math.min(yLimit - margin, pos.y));
      const cz = Math.max(-zLimit + margin, Math.min(zLimit - margin, pos.z));
      if (cx !== pos.x || cy !== pos.y || cz !== pos.z) {
        clamped = true;
      }
      if (clamped && rigidBody.current) {
        // Teleport the rigid body back inside and damp outward velocity
        try {
          rigidBody.current.setTranslation({ x: cx, y: cy, z: cz }, true);
          rigidBody.current.setLinvel(
            {
              x: Math.sign(cx - pos.x) * Math.abs(vel.x) * 0.2,
              y: Math.sign(cy - pos.y) * Math.abs(vel.y) * 0.2,
              z: Math.sign(cz - pos.z) * Math.abs(vel.z) * 0.2,
            },
            true
          );
        } catch (err) {
          if (import.meta.env.DEV) console.error(err);
        }
      }
    }
  });

  // 3. Visuals (Interpolation & Orientation) in Render Loop
  useFrame((_, delta) => {
    if (!modelRef.current || !rigidBody.current) return;

    // Position Interpolation (Smoothing)
    // Read directly from rigid body for latest physics state
    const targetPos = rigidBody.current.translation();

    // Frame-rate independent smoothing
    const smoothness = 20;
    const lerpFactor = 1 - Math.exp(-smoothness * delta);

    tempVec.set(targetPos.x, targetPos.y, targetPos.z);
    modelRef.current.position.lerp(tempVec, lerpFactor);

    // Orientation
    if (entity.velocity && entity.velocity.lengthSq() > 0.01) {
      tempVec.copy(entity.velocity).normalize();
      tempQuat.setFromUnitVectors(FORWARD, tempVec);
      modelRef.current.quaternion.slerp(tempQuat, 0.1);
    }
  });

  return (
    <group>
      {/* Physics Body (Invisible) */}
      <RigidBody
        ref={rigidBody}
        position={entity.position}
        colliders={false}
        enabledRotations={[false, false, false]}
        linearDamping={0.5}
        gravityScale={0}
        mass={1}
        ccd
      >
        <BallCollider args={[0.1]} />
      </RigidBody>

      {/* Visual Mesh (Interpolated) */}
      <primitive
        ref={modelRef}
        object={clone}
        scale={1.0}
        position={entity.position}
      />
    </group>
  );
};
