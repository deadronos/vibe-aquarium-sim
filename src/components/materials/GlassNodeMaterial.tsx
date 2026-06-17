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
  opacity = 0.14,
  roughness = 0.06,
  ior = 1.4,
  chromaticAberration = 0.06,
}: GlassNodeMaterialProps) => {
  const colorValue = new THREE.Color(typeof colorProp === 'string' ? colorProp : colorProp);
  const clampedOpacity = THREE.MathUtils.clamp(opacity, 0.08, 0.2);
  const clampedRoughness = THREE.MathUtils.clamp(roughness, 0.02, 0.18);
  const clampedIor = THREE.MathUtils.clamp(ior, 1.05, 1.6);
  const glow = THREE.MathUtils.clamp(chromaticAberration, 0, 0.08);

  return (
    <meshPhysicalNodeMaterial
      color={colorValue}
      opacity={clampedOpacity}
      roughness={clampedRoughness}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={Math.min(0.18, clampedRoughness + 0.03)}
      reflectivity={0.9}
      ior={clampedIor}
      specularIntensity={1}
      specularColor={new THREE.Color('#f7fbff')}
      emissive={new THREE.Color('#9bd1ff')}
      emissiveIntensity={glow * 0.5}
      transparent={true}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  );
};
