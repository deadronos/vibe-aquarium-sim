import { useGLTF } from '@react-three/drei';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
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
            // Debug dev logs to ensure materials are correct
            /* disabled for now, uncomment if needed
            if (import.meta.env.DEV) {
              try {
                console.log(
                  'Fish material:',
                  mat.name || mat.type,
                  mat.color?.getHexString ? `#${mat.color.getHexString()}` : mat.color,
                  mat
                );
              } catch (err) {
                console.error(err);
              }
              // If there's no texture map and the material has a color, tint it slightly for visibility
              try {
                if (!mat.map && mat.color) {
                  const tint = new Color(0xffb07f);
                  (mat.color as Color).lerp(tint, 0.55);
                }
              } catch (err) {
                console.error(err);
              }
            }
              */
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

  useFrame((_, delta) => {
    if (!rigidBody.current) return;

    if (!entity.rigidBodyHandle && rigidBody.current) {
      // store numeric handle only to avoid keeping WASM wrapper objects in ECS
      world.addComponent(entity, 'rigidBodyHandle', rigidBody.current.handle);
    }

    // 1. Sync Physics -> ECS (Source of Truth)
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

    // 2. Apply Boids Forces (ECS -> Physics)
    if (entity.steeringForce) {
      // Apply as impulse (Force * dt)
      tempVec.copy(entity.steeringForce).multiplyScalar(delta);
      rigidBody.current.applyImpulse(tempVec, true);
    }

    // 2b. Apply queued external forces (e.g. water drag) from systems
    if (entity.externalForce && (entity.externalForce.lengthSq() > 0.000001)) {
      tempVec.copy(entity.externalForce).multiplyScalar(delta);
      rigidBody.current.applyImpulse(tempVec, true);
      // clear queued external forces after applying
      entity.externalForce.set(0, 0, 0);
    }

    // 3. Orientation (Visual only)
    if (modelRef.current && entity.velocity && entity.velocity.lengthSq() > 0.01) {
      tempVec.copy(entity.velocity).normalize();
      tempQuat.setFromUnitVectors(FORWARD, tempVec);
      modelRef.current.quaternion.slerp(tempQuat, 0.1);
    }
  });

  return (
    <RigidBody
      ref={rigidBody}
      position={entity.position}
      colliders="ball"
      enabledRotations={[false, false, false]}
      linearDamping={0.5}
      gravityScale={0}
      ccd
    >
      <primitive ref={modelRef} object={clone} scale={1.0} />
    </RigidBody>
  );
};
