import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import type { Entity } from '../store';
import { BubbleTrail } from './effects/BubbleTrail';
import * as THREE from 'three';

const SPAWN_DURATION_SECONDS = 0.3;

export const Food = ({ entity }: { entity: Entity }) => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const spawnStartTimeRef = useRef<number | null>(null);

  // Apply initial velocity once
  useEffect(() => {
    if (rigidBody.current && entity.velocity) {
      rigidBody.current.setLinvel(entity.velocity, true);
    }
  }, [entity.velocity]);

  // Sync physics back to ECS
  useFrame((state: any) => {
    if (!rigidBody.current || !entity.position) return;

    const pos = rigidBody.current.translation();
    if (pos) {
      entity.position.set(pos.x, pos.y, pos.z);
    }

    // Apply spawn scale to mesh
    if (meshRef.current) {
      const time = state.clock?.elapsedTime || performance.now() / 1000;
      if (spawnStartTimeRef.current === null) {
        spawnStartTimeRef.current = time;
      }

      const elapsed = time - spawnStartTimeRef.current!;
      const progress = elapsed / SPAWN_DURATION_SECONDS;

      if (progress >= 1) {
        if (meshRef.current.scale.x !== 1) {
          meshRef.current.scale.setScalar(1);
        }
      } else {
        // Elastic ease out
        const eased = 1 - Math.pow(1 - progress, 3) * Math.cos(progress * Math.PI * 0.5);
        meshRef.current.scale.setScalar(eased);
      }
    }
  });

  return (
    <>
      <RigidBody
        ref={rigidBody}
        position={entity.position}
        colliders={false}
        linearDamping={3.0} // Higher damping in water
        angularDamping={1.0}
        restitution={0.2}
        mass={0.005} // 5 grams
        gravityScale={0.15} // Mostly neutrally buoyant, sinks slowly
      >
        <BallCollider args={[0.012]} /> {/* 1.2cm collision radius */}
        <mesh ref={meshRef} castShadow receiveShadow scale={0}>
          <sphereGeometry args={[0.015, 16, 16]} /> {/* 1.5cm visual radius */}
          <meshStandardMaterial
            color="#ffaa00"
            roughness={0.3}
            emissive="#ff6600"
            emissiveIntensity={0.3}
          />
        </mesh>
      </RigidBody>

      {/* Bubble trail effect - outside RigidBody to avoid double transform */}
      {entity.position && (
        <BubbleTrail parentPosition={entity.position!} bubbles={entity.bubbleConfig} />
      )}
    </>
  );
};
