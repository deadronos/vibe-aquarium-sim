import * as THREE from 'three';
import { TANK, writeSubstrateSurface } from '../config/scene';

const shadowPosition = new THREE.Vector3();
const shadowRotation = new THREE.Quaternion();
const shadowScale = new THREE.Vector3();
const FLOOR_ROTATION = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(1, 0, 0),
  -Math.PI / 2
);
const UP = new THREE.Vector3(0, 1, 0);
const shadowNormal = new THREE.Vector3();
const shadowLong = new THREE.Vector3();
const shadowAcross = new THREE.Vector3();
const shadowBasis = new THREE.Matrix4();

export interface FishShadowLayout {
  x: number;
  y: number;
  z: number;
  scaleX: number;
  scaleZ: number;
  strength: number;
  slopeX: number;
  slopeZ: number;
}

/** Writes a plane matrix onto a horizontal floor, with optional rotation around world Y. */
export const writeShadowMatrix = (
  matrix: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  width: number,
  depth: number,
  rotationY: number
) => {
  shadowPosition.set(x, y, z);
  shadowRotation.setFromAxisAngle(UP, rotationY).multiply(FLOOR_ROTATION);
  shadowScale.set(width, depth, 1);
  matrix.compose(shadowPosition, shadowRotation, shadowScale);
};

/** Writes a fish-plane matrix aligned to the local substrate tangent. */
export const writeFishShadowMatrix = (
  matrix: THREE.Matrix4,
  layout: FishShadowLayout,
  yaw: number
) => {
  shadowNormal.set(-layout.slopeX, 1, -layout.slopeZ).normalize();
  shadowLong.set(Math.sin(yaw), 0, Math.cos(yaw));
  shadowLong.addScaledVector(shadowNormal, -shadowLong.dot(shadowNormal)).normalize();
  shadowAcross.crossVectors(shadowNormal, shadowLong).normalize();
  shadowBasis.makeBasis(shadowLong, shadowAcross, shadowNormal);
  shadowRotation.setFromRotationMatrix(shadowBasis);
  shadowPosition.set(layout.x, layout.y, layout.z);
  shadowScale.set(layout.scaleX, layout.scaleZ, 1);
  matrix.compose(shadowPosition, shadowRotation, shadowScale);
};

/** Projects a fish footprint onto the sand and fades its size/contrast with altitude. */
export const writeFishShadowLayout = (
  output: FishShadowLayout,
  x: number,
  y: number,
  z: number,
  fishScale: number,
  growth: number
) => {
  writeSubstrateSurface(output, x, z);
  const height = Math.max(0, y - output.y);
  const denominator = Math.max(TANK.waterLevel - output.y, 0.001);
  const altitude = Math.min(1, height / denominator);
  const visibility = 1 - altitude;
  const falloff = 0.12 + 0.88 * visibility * visibility;
  const length = fishScale * growth;

  output.x = x;
  output.y += 0.003;
  output.z = z;
  output.scaleX = length * 1.45 * (0.5 + 0.5 * falloff);
  output.scaleZ = length * 0.7 * (0.5 + 0.5 * falloff);
  output.strength = falloff;
};
