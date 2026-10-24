import * as THREE from 'three';
import type { Materials } from './materials';

export const CoffeeTable = ({ m }: { m: Materials }) => (
  <group position={[0.05, 0, 0.3]}>
    <mesh position-y={0.4} scale={[1, 1, 0.58]} material={m.oak} castShadow receiveShadow>
      <cylinderGeometry args={[0.52, 0.52, 0.032, 48]} />
    </mesh>
    {[0.6, 2.2, 3.8, 5.4].map((a, i) => (
      <mesh
        key={i}
        position={[Math.cos(a) * 0.36, 0.2, Math.sin(a) * 0.19]}
        rotation={[Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]}
        material={m.oak}
        castShadow
      >
        <cylinderGeometry args={[0.017, 0.011, 0.4, 8]} />
      </mesh>
    ))}
    {/* A stack of books and a mug. */}
    {[
      ['#2f4858', 0.24, 0.035, 0.17, 0.1],
      ['#c4a35a', 0.22, 0.03, 0.16, -0.08],
      ['#8c3b2f', 0.2, 0.028, 0.15, 0.2],
    ].map(([color, w, h, d, rot], i) => (
      <mesh
        key={i}
        position={[-0.18, 0.432 + i * 0.032, 0.02]}
        rotation-y={rot as number}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w as number, h as number, d as number]} />
        <meshStandardMaterial color={color as string} roughness={0.75} />
      </mesh>
    ))}
    <mesh position={[0.2, 0.46, 0.06]} castShadow>
      <cylinderGeometry args={[0.04, 0.036, 0.09, 24, 1, true]} />
      <meshStandardMaterial color="#eae4da" roughness={0.3} side={THREE.DoubleSide} />
    </mesh>
  </group>
);
