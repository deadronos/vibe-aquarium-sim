import { PointsNodeMaterial } from 'three/webgpu';
import {
  color,
  float,
  vec3,
  time,
  attribute,
  positionLocal,
  mod,
  fract,
  sin,
  cos,
  vec4,
} from 'three/tsl';
import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';

// Extend so we can use <pointsNodeMaterial /> in JSX
extend({ PointsNodeMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    pointsNodeMaterial: ThreeElement<typeof PointsNodeMaterial>;
  }
}

interface ParticleNodeMaterialProps {
  color?: string | THREE.Color;
  opacity?: number;
  pointSize?: number;
  tankVolume?: [number, number, number];
  driftVelocity?: [number, number, number];
}

export const ParticleNodeMaterial = ({
  color: colorProp = '#ffffff',
  opacity = 0.4,
  pointSize = 0.06,
  tankVolume = [1, 1, 1],
  driftVelocity = [0.08, -0.05, 0.02],
}: ParticleNodeMaterialProps) => {
  const seed = attribute('seed');
  const t = time;

  // 1. Drift Logic
  const driftVelNode = vec3(new THREE.Vector3(...driftVelocity));
  const tankVolNode = vec3(new THREE.Vector3(...tankVolume));
  const driftOffset = driftVelNode.mul(t);

  // Speed variation based on seed
  const speedVar = float(0.8).add(float(0.4).mul(fract(seed.mul(123.45))));
  const variedDrift = driftOffset.mul(speedVar);

  // Initial position wrapped
  const p = positionLocal.add(variedDrift);
  
  // Wrap around volume
  const halfVol = tankVolNode.mul(0.5);
  const wrappedP = mod(p.add(halfVol), tankVolNode).sub(halfVol);

  // 2. Flutter
  const flutterTime = t.mul(0.5).add(seed.mul(50.0));
  const flutterX = sin(flutterTime).mul(0.05).add(sin(flutterTime.mul(1.7)).mul(0.03));
  const flutterY = cos(flutterTime.mul(1.3)).mul(0.05).add(sin(flutterTime.mul(0.8)).mul(0.03));
  const flutterZ = sin(flutterTime.mul(1.1)).mul(0.05).add(cos(flutterTime.mul(1.5)).mul(0.03));
  
  // Construction of vec3 from nodes needs to be careful
  const flutterVec = vec3(new THREE.Vector3(1, 0, 0)).mul(flutterX)
    .add(vec3(new THREE.Vector3(0, 1, 0)).mul(flutterY))
    .add(vec3(new THREE.Vector3(0, 0, 1)).mul(flutterZ));
    
  const finalP = wrappedP.add(flutterVec);

  // 3. Fragment Logic (Twinkle and Shape)
  const c = colorByProp(colorProp);
  const twinkle = float(0.6).add(float(0.4).mul(sin(seed.mul(99.0).add(c.r))));
  
  const finalAlpha = float(opacity).mul(twinkle);

  return (
    <pointsNodeMaterial
      positionNode={finalP}
      colorNode={vec4(c.xyz, finalAlpha)}
      size={pointSize}
      transparent={true}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      sizeAttenuation={true}
    />
  );
};

// Helper to convert prop to TSL color node
function colorByProp(c: string | THREE.Color) {
  return color(new THREE.Color(typeof c === 'string' ? c : c));
}
