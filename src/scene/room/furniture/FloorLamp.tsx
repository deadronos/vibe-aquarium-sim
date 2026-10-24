import { useFrame } from '@react-three/fiber';
import { LAMP } from '../../../config/scene';
import { daylight } from '../../daylight';
import type { Materials } from './materials';

export const FloorLamp = ({ m }: { m: Materials }) => {
  useFrame(() => {
    m.shade.emissiveIntensity = daylight.lamp * 1.6;
  });
  return (
    <group position={[LAMP.x, 0, LAMP.z]}>
      <mesh position-y={0.012} material={m.black} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.16, 0.024, 32]} />
      </mesh>
      <mesh position-y={0.76} material={m.brass} castShadow>
        <cylinderGeometry args={[0.009, 0.009, 1.5, 10]} />
      </mesh>
      <mesh position-y={LAMP.shadeY} material={m.shade} castShadow>
        <cylinderGeometry args={[0.17, 0.21, 0.28, 40, 1, true]} />
      </mesh>
    </group>
  );
};
