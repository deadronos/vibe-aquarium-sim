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
  color: colorProp = '#ecf6ff',
  transmission = 0.99,
  thickness = 1.5,
  opacity = 1.0,
  roughness = 0.01,
  ior = 1.5,
  chromaticAberration = 0.06,
}: GlassNodeMaterialProps) => {
  const colorValue = new THREE.Color(typeof colorProp === 'string' ? colorProp : colorProp);
  const clampedOpacity = THREE.MathUtils.clamp(opacity, 0.0, 1.0);
  const clampedRoughness = THREE.MathUtils.clamp(roughness, 0.0, 1.0);
  const clampedIor = THREE.MathUtils.clamp(ior, 1.0, 2.0);
  const glow = THREE.MathUtils.clamp(chromaticAberration, 0, 0.2);

  return (
    <meshPhysicalNodeMaterial
      color={colorValue}
      transmission={transmission}
      thickness={thickness}
      opacity={clampedOpacity}
      roughness={clampedRoughness}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={clampedRoughness}
      reflectivity={0.9}
      ior={clampedIor}
      specularIntensity={1}
      specularColor={new THREE.Color('#f7fbff')}
      emissive={new THREE.Color('#9bd1ff')}
      emissiveIntensity={glow * 0.5}
      transparent={clampedOpacity < 1.0 || transmission > 0}
      depthWrite={true}
      side={THREE.DoubleSide}
    />
  );
};
