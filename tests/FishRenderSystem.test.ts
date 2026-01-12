import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import * as THREE from 'three';
import { MODEL_URLS, extractModelAssets } from '../src/systems/FishRenderSystem';

describe('FishRenderSystem model configuration', () => {
  it('exposes three model URLs and includes the 3rd model', () => {
    expect(Array.isArray(MODEL_URLS)).toBe(true);
    expect(MODEL_URLS.length).toBe(3);
    expect(MODEL_URLS).toContain('/Copilot3D-fish3.glb');
  });

  it('model URLs point to files in public folder and are .glb', () => {
    for (const url of MODEL_URLS) {
      expect(typeof url).toBe('string');
      expect(url.endsWith('.glb')).toBe(true);

      const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''));
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('extractModelAssets returns geometry and material for a scene with a mesh', () => {
    const scene = new THREE.Object3D();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    scene.add(mesh);

    const { geo, mat } = extractModelAssets(scene);
    expect(geo).not.toBeNull();
    expect(mat).not.toBeNull();
    expect((geo as THREE.BufferGeometry).isBufferGeometry).toBe(true);
    // material might be an array or single material
    if (Array.isArray(mat)) {
      expect((mat as THREE.Material[]).length).toBeGreaterThan(0);
    } else {
      expect((mat as THREE.Material).isMaterial).toBe(true);
    }
  });

  it('extractModelAssets returns nulls for an empty scene', () => {
    const empty = new THREE.Object3D();
    const { geo, mat } = extractModelAssets(empty);
    expect(geo).toBeNull();
    expect(mat).toBeNull();
  });
});
