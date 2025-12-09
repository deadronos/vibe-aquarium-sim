import { useGLTF } from '@react-three/drei';
import { RigidBody, BallCollider, RapierRigidBody } from '@react-three/rapier';
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

  // Cache the rigid body handle once the ref is available
  useEffect(() => {
    if (rigidBody.current && !entity.rigidBodyHandle) {
      world.addComponent(entity, 'rigidBodyHandle', rigidBody.current.handle);
    }
  }, [entity]);

  // Physics interactions and visuals in render loop
  // useFrame runs after the automatic physics step, making it safe to read/write
  useFrame((_, delta) => {
    if (!rigidBody.current) return;

    // 1. Calculate target velocity from forces (ECS -> Physics)
    // Convert forces to velocity changes instead of applying impulses
    if (!entity.targetVelocity) {
      entity.targetVelocity = new Vector3();
    }
    
    const dt = 1 / 60;
    const currentVel = rigidBody.current.linvel();
    entity.targetVelocity.set(currentVel.x, currentVel.y, currentVel.z);
    
    // Apply steering force
    if (entity.steeringForce && entity.steeringForce.lengthSq() > 1e-6) {
      tempVec.copy(entity.steeringForce).multiplyScalar(dt);
      entity.targetVelocity.add(tempVec);
    }
    
    // Apply external force
    if (entity.externalForce && entity.externalForce.lengthSq() > 1e-6) {
      tempVec.copy(entity.externalForce).multiplyScalar(dt);
      entity.targetVelocity.add(tempVec);
      entity.externalForce.set(0, 0, 0);
    }
    
    // Apply target velocity directly
    if (entity.targetVelocity) {
      rigidBody.current.setLinvel(entity.targetVelocity, true);
    }

    // 2. Sync Physics -> ECS
    const pos = rigidBody.current.translation();
    const vel = rigidBody.current.linvel();
    if (pos && vel) {
      entity.position?.set(pos.x, pos.y, pos.z);
      entity.velocity?.set(vel.x, vel.y, vel.z);
    }

    // 3. Visuals (Interpolation & Orientation)
    if (!modelRef.current || !entity.position) return;

    // Position Interpolation (Smoothing)
    const smoothness = 20;
    const lerpFactor = 1 - Math.exp(-smoothness * delta);

    tempVec.copy(entity.position);
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
        ccd
      >
        <BallCollider args={[0.06]} />
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
