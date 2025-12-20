import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, BallCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import type { Entity } from '../store';
import { BubbleTrail } from './effects/BubbleTrail';
import * as THREE from 'three';

export const Food = ({ entity }: { entity: Entity }) => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [spawnScale, setSpawnScale] = useState(0);

  // Spawn animation - scale from 0 to 1
  useEffect(() => {
    let frame: number;
    const startTime = Date.now();
    const duration = 300;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Elastic ease out
      const eased = 1 - Math.pow(1 - progress, 3) * Math.cos(progress * Math.PI * 0.5);
      setSpawnScale(eased);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Apply initial velocity once
  useEffect(() => {
    if (rigidBody.current && entity.velocity) {
      rigidBody.current.setLinvel(entity.velocity, true);
    }
  }, [entity.velocity]);

  // Sync physics back to ECS
  useFrame(() => {
    if (!rigidBody.current || !entity.position) return;

    const pos = rigidBody.current.translation();
    if (pos) {
      entity.position.set(pos.x, pos.y, pos.z);
    }

    // Apply spawn scale to mesh
    if (meshRef.current) {
      meshRef.current.scale.setScalar(spawnScale);
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
        <mesh ref={meshRef} castShadow receiveShadow>
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
      {entity.position && <BubbleTrail parentPosition={entity.position!} />}
    </>
  );
};
