import { extend, type ThreeElement } from '@react-three/fiber';
import * as THREE from 'three';
import { MeshBasicNodeMaterial, MeshPhysicalNodeMaterial, PointsNodeMaterial } from 'three/webgpu';
import { normalize, vec3 } from 'three/tsl';

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshBasicNodeMaterial: ThreeElement<typeof MeshBasicNodeMaterial>;
    meshPhysicalNodeMaterial: ThreeElement<typeof MeshPhysicalNodeMaterial>;
    pointsNodeMaterial: ThreeElement<typeof PointsNodeMaterial>;
  }
}

const registeredNodeMaterials = new Set<string>();

/** Registers a node material with R3F's catalogue exactly once. */
export function registerNodeMaterial(name: string, ctor: new (...args: any[]) => any): void {
  if (registeredNodeMaterials.has(name)) return;
  registeredNodeMaterials.add(name);
  extend({ [name]: ctor } as any);
}

/** Resolves a string or Three color prop without needless clones. */
export function resolveThreeColor(c: string | THREE.Color): THREE.Color {
  return typeof c === 'string' ? new THREE.Color(c) : c;
}

/** Shared unit-axis TSL vectors; module-level keeps material renders allocation-free. */
export const AXIS_X = vec3(new THREE.Vector3(1, 0, 0));
export const AXIS_Y = vec3(new THREE.Vector3(0, 1, 0));
export const AXIS_Z = vec3(new THREE.Vector3(0, 0, 1));

/** TSL normalize with a name that flags the div-by-zero-safe intent. */
export const tslSafeNormalize = (v: any) => normalize(v);
