import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../../../config/scene';
import { fabricTexture, woodGrainTexture } from '../../textures';

const tex = (texture: THREE.Texture, x: number, y: number, rotate = false) => {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  if (rotate) {
    copy.center.set(0.5, 0.5);
    copy.rotation = Math.PI / 2;
  }
  copy.needsUpdate = true;
  return copy;
};

export const useMaterials = () =>
  useMemo(
    () => ({
      walnut: new THREE.MeshStandardMaterial({
        map: tex(woodGrainTexture(), 1.2, 1),
        color: '#9c7a62',
        roughness: 0.5,
      }),
      walnutTop: new THREE.MeshStandardMaterial({
        map: tex(woodGrainTexture(), 1.4, 0.8),
        color: '#a88569',
        roughness: 0.35,
      }),
      oak: new THREE.MeshStandardMaterial({
        map: tex(woodGrainTexture(), 1, 1),
        color: '#f0d8bd',
        roughness: 0.5,
      }),
      sofa: new THREE.MeshStandardMaterial({
        map: tex(fabricTexture(), 8, 8),
        color: PALETTE.sofa,
        roughness: 0.92,
      }),
      cushion: new THREE.MeshStandardMaterial({
        map: tex(fabricTexture(), 6, 6),
        color: '#7d8f95',
        roughness: 0.92,
      }),
      throwPillow: new THREE.MeshStandardMaterial({
        map: tex(fabricTexture(), 4, 4),
        color: '#c98a5e',
        roughness: 0.9,
      }),
      brass: new THREE.MeshStandardMaterial({
        color: PALETTE.brass,
        metalness: 0.85,
        roughness: 0.32,
      }),
      black: new THREE.MeshStandardMaterial({
        color: PALETTE.blackMetal,
        metalness: 0.4,
        roughness: 0.45,
      }),
      ceramic: new THREE.MeshStandardMaterial({ color: PALETTE.pot, roughness: 0.55 }),
      soil: new THREE.MeshStandardMaterial({ color: '#3a2b20', roughness: 1 }),
      shade: new THREE.MeshStandardMaterial({
        map: tex(fabricTexture(), 6, 3),
        color: '#efe3cf',
        roughness: 0.95,
        side: THREE.DoubleSide,
        emissive: new THREE.Color('#ffb661'),
        emissiveIntensity: 0,
      }),
      foam: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 }),
    }),
    []
  );

export type Materials = ReturnType<typeof useMaterials>;
