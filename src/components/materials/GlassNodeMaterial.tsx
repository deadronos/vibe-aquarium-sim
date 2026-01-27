import { MeshPhysicalNodeMaterial } from 'three/webgpu';

import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';

// Extend so we can use <meshPhysicalNodeMaterial /> in JSX
extend({ MeshPhysicalNodeMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshPhysicalNodeMaterial: ThreeElement<typeof MeshPhysicalNodeMaterial>;
  }
}

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
      color={new THREE.Color(typeof colorProp === 'string' ? colorProp : colorProp)}
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
