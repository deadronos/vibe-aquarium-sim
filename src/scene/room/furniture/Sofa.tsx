import { RoundedBox } from '@react-three/drei';
import type { Materials } from './materials';

/** Three-seat sofa facing the tank. */
export const Sofa = ({ m }: { m: Materials }) => {
  const width = 2.2;
  const depth = 0.92;
  return (
    <group position={[0.1, 0, 1.45]}>
      <RoundedBox
        args={[width, 0.34, depth]}
        radius={0.04}
        position={[0, 0.3, 0]}
        material={m.sofa}
        castShadow
        receiveShadow
      />
      {[-1, 0, 1].map((i) => (
        <group key={i}>
          <RoundedBox
            args={[0.62, 0.16, 0.66]}
            radius={0.06}
            smoothness={4}
            position={[i * 0.64, 0.54, -0.08]}
            material={m.cushion}
            castShadow
            receiveShadow
          />
          <RoundedBox
            args={[0.62, 0.48, 0.2]}
            radius={0.08}
            smoothness={4}
            position={[i * 0.64, 0.78, 0.3]}
            rotation-x={-0.16}
            material={m.cushion}
            castShadow
            receiveShadow
          />
        </group>
      ))}
      <RoundedBox
        args={[width, 0.6, 0.16]}
        radius={0.05}
        position={[0, 0.66, 0.4]}
        material={m.sofa}
        castShadow
        receiveShadow
      />
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.17, 0.62, depth]}
          radius={0.06}
          smoothness={4}
          position={[side * (width / 2 - 0.085), 0.47, 0]}
          material={m.sofa}
          castShadow
          receiveShadow
        />
      ))}
      <RoundedBox
        args={[0.42, 0.38, 0.13]}
        radius={0.06}
        smoothness={4}
        position={[-0.72, 0.78, 0.13]}
        rotation={[-0.25, 0.3, 0.12]}
        material={m.throwPillow}
        castShadow
      />
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx! * (width / 2 - 0.1), 0.065, sz! * (depth / 2 - 0.1)]}
          material={m.walnut}
          castShadow
        >
          <cylinderGeometry args={[0.02, 0.014, 0.13, 8]} />
        </mesh>
      ))}
    </group>
  );
};
