import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { FISH_SCENE_DIMENSIONS, makeScene } from './support/fishScenes';

const firstMesh = (scene: THREE.Object3D): THREE.Mesh => {
  const mesh = scene.children.find((child): child is THREE.Mesh => (child as THREE.Mesh).isMesh);
  if (!mesh) throw new Error('makeScene did not add a mesh');
  return mesh;
};

describe('makeScene fixture', () => {
  it('reuses the caller-supplied material instance', () => {
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const scene = makeScene(material);

    const mesh = firstMesh(scene);
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.material).toBe(material);
  });

  it('constructs a standard material from a numeric colour', () => {
    const material = firstMesh(makeScene(0x00ff00)).material as THREE.MeshStandardMaterial;

    expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(material.color.getHex()).toBe(0x00ff00);
  });

  it('defaults to a 1x1x1 box', () => {
    const geometry = firstMesh(makeScene(new THREE.MeshStandardMaterial())).geometry as THREE.BoxGeometry;

    expect(geometry.parameters.width).toBe(1);
    expect(geometry.parameters.height).toBe(1);
    expect(geometry.parameters.depth).toBe(1);
  });

  it('honours explicitly requested dimensions', () => {
    const geometry = firstMesh(makeScene(0x0000ff, FISH_SCENE_DIMENSIONS)).geometry as THREE.BoxGeometry;

    expect(geometry.parameters.width).toBe(0.2);
    expect(geometry.parameters.height).toBe(0.1);
    expect(geometry.parameters.depth).toBe(0.05);
  });
});
