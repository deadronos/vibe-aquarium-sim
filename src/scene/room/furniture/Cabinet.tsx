import { CABINET, TANK, TANK_ORIGIN } from '../../../config/scene';
import type { Materials } from './materials';

/** Mid-century sideboard the tank sits on. */
export const Cabinet = ({ m }: { m: Materials }) => {
  const legH = 0.14;
  const bodyH = CABINET.height - legH;
  const z = TANK_ORIGIN[2];
  const front = CABINET.depth / 2;
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, legH + bodyH / 2, 0]} material={m.walnut} castShadow receiveShadow>
        <boxGeometry args={[CABINET.width, bodyH - 0.03, CABINET.depth]} />
      </mesh>
      <mesh
        position={[0, CABINET.height - 0.015, 0]}
        material={m.walnutTop}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CABINET.width + 0.02, 0.03, CABINET.depth + 0.02]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Door panels with a shadow gap and a slim brass pull. */}
          <mesh
            position={[side * CABINET.width * 0.25, legH + bodyH / 2 - 0.01, front + 0.006]}
            material={m.walnut}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[CABINET.width / 2 - 0.02, bodyH - 0.07, 0.012]} />
          </mesh>
          <mesh position={[side * 0.05, legH + bodyH * 0.62, front + 0.022]} material={m.brass}>
            <boxGeometry args={[0.012, 0.16, 0.012]} />
          </mesh>
        </group>
      ))}
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx! * (CABINET.width / 2 - 0.08), legH / 2, sz! * (CABINET.depth / 2 - 0.07)]}
          rotation={[sz! * 0.08, 0, -sx! * 0.08]}
          material={m.walnut}
          castShadow
        >
          <cylinderGeometry args={[0.018, 0.011, legH, 10]} />
        </mesh>
      ))}
      {/* Leveling mat under the tank. */}
      <mesh position={[0, CABINET.height + 0.006, 0]} material={m.foam}>
        <boxGeometry args={[TANK.width + 0.01, 0.012, TANK.depth + 0.01]} />
      </mesh>
      {/* Fish food tin. */}
      <group position={[CABINET.width / 2 - 0.05, CABINET.height + 0.045, 0.14]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.09, 20]} />
          <meshStandardMaterial color="#d8603b" roughness={0.5} />
        </mesh>
        <mesh position-y={0.05} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.012, 20]} />
          <meshStandardMaterial color="#f1e7d6" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
};
