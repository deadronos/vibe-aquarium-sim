import { useGLTF } from "@react-three/drei";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Entity } from "../store";
import { Vector3, Quaternion, Group, SRGBColorSpace, Mesh, Material, Color } from "three";
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
    c.traverse((child: any) => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).castShadow = true;
        (child as Mesh).receiveShadow = true;

        // If there's a texture map ensure sRGB encoding for correct color
        const material = (child as Mesh).material as Material | Material[] | undefined;
        if (material) {
          // Support both arrays and single material
          const mats = Array.isArray(material) ? material : [material];
            for (const m of mats) {
            const matAny = m as any;
            if (matAny.map) {
              // Newer three.js versions use `colorSpace` instead of `encoding`.
              // Use SRGBColorSpace so color textures display correctly.
              matAny.map.colorSpace = SRGBColorSpace;
              if (typeof matAny.map.needsUpdate !== 'undefined') matAny.map.needsUpdate = true;
            }
            // Debug dev logs to ensure materials are correct
            if (import.meta.env.DEV) {
              try {
                // eslint-disable-next-line no-console
                console.log('Fish material:', matAny.name || matAny.type, matAny.color?.getHexString ? `#${matAny.color.getHexString()}` : matAny.color, matAny);
              } catch (e) {}
              // If there's no texture map and the material has a color, tint it slightly for visibility
              try {
                if (!matAny.map && matAny.color) {
                  const tint = new Color(0xffb07f);
                  (matAny.color as Color).lerp(tint, 0.55);
                }
              } catch (e) {}
            }
            if (typeof matAny.needsUpdate !== 'undefined') matAny.needsUpdate = true;
          }
        }
      }
    });
    return c;
  }, [scene]);

  useFrame((_, delta) => {
    if (!rigidBody.current) return;

    // 1. Sync Physics -> ECS (Source of Truth)
    const pos = rigidBody.current.translation();
    const vel = rigidBody.current.linvel();

    if (pos && vel) {
        entity.position?.set(pos.x, pos.y, pos.z);
        entity.velocity?.set(vel.x, vel.y, vel.z);

        // Clamp rigid body position to stay inside tank bounds (X [-2,2], Y [-1,1], Z [-1,1])
        const xLimit = 2.0, yLimit = 1.0, zLimit = 1.0;
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
                rigidBody.current.setLinvel({ x: Math.sign(cx - pos.x) * Math.abs(vel.x) * 0.2, y: Math.sign(cy - pos.y) * Math.abs(vel.y) * 0.2, z: Math.sign(cz - pos.z) * Math.abs(vel.z) * 0.2 }, true);
            } catch (e) {
                // Some Rapier bindings may differ; ignore errors in fallback
            }
        }
    }

    // 2. Apply Boids Forces (ECS -> Physics)
     if (entity.steeringForce) {
       // Apply as impulse (Force * dt)
       tempVec.copy(entity.steeringForce).multiplyScalar(delta);
       rigidBody.current.applyImpulse(tempVec, true);
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
      <primitive
        ref={modelRef}
        object={clone}
        scale={1.0}
      />
    </RigidBody>
  );
}
