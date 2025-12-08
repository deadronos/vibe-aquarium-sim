import { useGLTF } from "@react-three/drei";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { Entity } from "../store";
import { Vector3, Quaternion, Group } from "three";
import fishUrl from '../assets/gltf/CopilotClownFish.glb?url';

const tempVec = new Vector3();
const tempQuat = new Quaternion();
const FORWARD = new Vector3(0, 0, 1);

export const Fish = ({ entity }: { entity: Entity }) => {
  const { scene } = useGLTF(fishUrl);
  const rigidBody = useRef<RapierRigidBody>(null);
  const modelRef = useRef<Group>(null);

  // Clone scene
  const clone = useMemo(() => scene.clone(), [scene]);

  useFrame((_, delta) => {
    if (!rigidBody.current) return;

    // 1. Sync Physics -> ECS (Source of Truth)
    const pos = rigidBody.current.translation();
    const vel = rigidBody.current.linvel();

    if (pos && vel) {
        entity.position?.set(pos.x, pos.y, pos.z);
        entity.velocity?.set(vel.x, vel.y, vel.z);
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
        linearDamping={0.8}
        gravityScale={0}
    >
      <primitive
        ref={modelRef}
        object={clone}
        scale={1.0}
      />
    </RigidBody>
  );
}
