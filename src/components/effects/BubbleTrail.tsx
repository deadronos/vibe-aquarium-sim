import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BubbleTrailProps {
  parentPosition: THREE.Vector3;
  bubbles?: Array<{
    offset: THREE.Vector3;
    speed: number;
    phase: number;
    size: number;
    wobble: number;
  }>;
}

const BUBBLE_COUNT = 8;

export const BubbleTrail = ({ parentPosition, bubbles: propBubbles }: BubbleTrailProps) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const defaultBubbles = Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
    offset: new THREE.Vector3(0, i * 0.01, 0),
    speed: 0.15,
    phase: i,
    size: 0.004,
    wobble: 0.01,
  }));

  const bubbles = propBubbles ?? defaultBubbles;
  useFrame((state) => {
    if (!instancedMeshRef.current) return;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const bubble = bubbles[i];

      // Position relative to parent with upward drift and wobble
      const yOffset = (time * bubble.speed + bubble.phase) % 0.5;
      const xWobble = Math.sin(time * 3 + bubble.phase) * bubble.wobble;
      const zWobble = Math.cos(time * 2 + bubble.phase) * bubble.wobble;

      dummy.position.set(
        parentPosition.x + bubble.offset.x + xWobble,
        parentPosition.y + yOffset,
        parentPosition.z + bubble.offset.z + zWobble
      );

      // Fade out as bubbles rise
      const scale = bubble.size * (1 - yOffset * 1.5);
      dummy.scale.setScalar(Math.max(0, scale));

      dummy.updateMatrix();
      instancedMeshRef.current.setMatrixAt(i, dummy.matrix);
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, BUBBLE_COUNT]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color="#aaeeff"
        emissive="#44bbff"
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
