import type { BufferGeometry } from 'three';

import { ParticleNodeMaterial } from '../materials/ParticleNodeMaterial';
import { useParticleUniforms } from './useParticleUniforms';

export interface ParticleLayerProps {
  geometry: BufferGeometry;
  color: string;
  pointSize: number;
  opacity: number;
  volume: { x: number; y: number; z: number };
  drift: [number, number, number];
  isWebGPU: boolean;
  label: string;
}

export const ParticleLayer = ({
  geometry,
  color,
  pointSize,
  opacity,
  volume,
  drift,
  isWebGPU,
  label,
}: ParticleLayerProps) => {
  const shaderMaterial = useParticleUniforms({
    isWebGPU,
    color,
    pointSize,
    opacity,
    volume,
    drift,
    label,
  });

  return (
    <points
      geometry={geometry}
      material={isWebGPU ? undefined : (shaderMaterial ?? undefined)}
      frustumCulled={false}
    >
      {isWebGPU && (
        <ParticleNodeMaterial
          color={color}
          pointSize={pointSize}
          opacity={opacity}
          tankVolume={[volume.x, volume.y, volume.z]}
          driftVelocity={[drift[0], drift[1], drift[2]]}
        />
      )}
    </points>
  );
};
