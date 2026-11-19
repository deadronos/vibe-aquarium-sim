import { useMemo } from 'react';
import { TANK } from '../../config/scene';
import { useDispose } from '../dispose';
import { createWaterSurfaceMaterial } from './waterSurfaceMaterial';

const { width: W, depth: D, waterLevel: WL } = TANK;

/** Water surface: a faint sheen from above, a bright wavering mirror from below. */
export const WaterSurface = () => {
  const surface = useMemo(() => createWaterSurfaceMaterial(), []);
  useDispose(surface);
  return (
    <mesh position-y={WL} rotation-x={-Math.PI / 2} material={surface} renderOrder={5}>
      <planeGeometry args={[W - 0.002, D - 0.002]} />
    </mesh>
  );
};
