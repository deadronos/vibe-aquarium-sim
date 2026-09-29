import { MeshPhysicalNodeMaterial } from 'three/webgpu';

import * as THREE from 'three';
import { registerNodeMaterial, resolveThreeColor } from './materialUtils';

registerNodeMaterial('MeshPhysicalNodeMaterial', MeshPhysicalNodeMaterial);

interface GlassNodeMaterialProps {
  color?: string | THREE.Color;
  transmission?: number;
  opacity?: number;
  roughness?: number;
  thickness?: number;
  ior?: number;
  chromaticAberration?: number;
}

export const GlassNodeMaterial = ({
  color: colorProp = '#ffffff',
  transmission = 1.0,
  opacity = 1.0,
  roughness = 0.05,
  thickness = 1.5,
  ior = 1.5,
  chromaticAberration = 0.04, // Default slight chromatic aberration
}: GlassNodeMaterialProps) => {
  return (
    <meshPhysicalNodeMaterial
      color={resolveThreeColor(colorProp)}
      transmission={transmission}
      opacity={opacity}
      roughness={roughness}
      metalness={0}
      thickness={thickness}
      ior={ior}
      dispersion={chromaticAberration} // 'dispersion' is the new standard property for chromatic aberration in Three.js
      transparent={true}
      depthWrite={false}
      side={THREE.FrontSide}
    />
  );
};
