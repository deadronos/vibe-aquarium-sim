import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  color,
  float,
  vec3,
  time,
  positionWorld,
  normalWorld,
  mx_noise_vec3,
  smoothstep,
  vec4,
  abs
} from 'three/tsl';
import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';

// Extend so we can use <meshBasicNodeMaterial /> in JSX
extend({ MeshBasicNodeMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshBasicNodeMaterial: ThreeElement<typeof MeshBasicNodeMaterial>;
  }
}

interface TankCausticsNodeMaterialProps {
  color?: string | THREE.Color;
  intensity?: number;
  scale?: number;
  speed?: number;
}

export const TankCausticsNodeMaterial = ({
  color: colorProp = '#aaddff',
  intensity = 0.85,
  scale = 1.35,
  speed = 0.45,
}: TankCausticsNodeMaterialProps) => {
  const t = time;

  // World space noise for continuous pattern
  const p = positionWorld.mul(scale);
  const timeOffset = vec3(new THREE.Vector3(0, 1, 0)).mul(t.mul(speed));
  const noiseCtx = p.add(timeOffset);

  // Domain warping for more organic caustics
  const warp = mx_noise_vec3(noiseCtx.mul(0.35)).x;
  const n = mx_noise_vec3(noiseCtx.add(vec3(warp).mul(0.6))).x;

  // Remap noise [-1, 1] -> [0, 1]
  const nn = n.mul(0.5).add(0.5);

  // Caustic lines: sharpen
  const causticsNode = smoothstep(0.58, 0.88, nn);
  const causticsSquared = causticsNode.mul(causticsNode);

  // Fade on vertical walls
  const surfaceFade = float(0.6).add(float(0.4).mul(abs(normalWorld.y)));

  const finalStrength = causticsSquared.mul(intensity).mul(surfaceFade);
  const outColorNode = color(new THREE.Color(typeof colorProp === 'string' ? colorProp : colorProp)).mul(finalStrength);

  return (
    <meshBasicNodeMaterial
      colorNode={vec4(outColorNode.xyz, finalStrength)}
      transparent={true}
      blending={THREE.AdditiveBlending}
      depthWrite={false}
      side={THREE.DoubleSide}
    />
  );
};
