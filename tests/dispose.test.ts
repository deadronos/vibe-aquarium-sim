import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { disposeDeep, release, retain } from '../src/scene/dispose';
import { isTextureCopy } from '../src/scene/textures';

vi.mock('../src/scene/textures', () => ({
  isTextureCopy: vi.fn((texture: THREE.Texture) => texture.name === 'copy'),
}));

const watch = (resource: THREE.EventDispatcher<{ dispose: object }>) => {
  const onDispose = vi.fn();
  resource.addEventListener('dispose', onDispose);
  return onDispose;
};

const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('disposeDeep', () => {
  it('disposes geometries and materials inside arrays and plain objects', () => {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial();
    const nested = new THREE.PlaneGeometry();
    const spies = [watch(geometry), watch(material), watch(nested)];
    disposeDeep({ geometry, list: [material, { nested }], count: 3, label: 'x' });
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
  });

  it('frees texture copies a material holds but leaves shared textures alone', () => {
    const copy = new THREE.Texture();
    copy.name = 'copy';
    const shared = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: copy, roughnessMap: shared });
    const copySpy = watch(copy);
    const sharedSpy = watch(shared);
    disposeDeep(material);
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(sharedSpy).not.toHaveBeenCalled();
    expect(isTextureCopy).toHaveBeenCalled();
  });

  it('does not walk into class instances other than disposables', () => {
    const geometry = new THREE.BoxGeometry();
    const spy = watch(geometry);
    disposeDeep(new THREE.Mesh(geometry));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('release', () => {
  it('disposes after the current task', async () => {
    const dispose = vi.fn();
    release('a', dispose);
    expect(dispose).not.toHaveBeenCalled();
    await flush();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('is cancelled by retain, as when StrictMode remounts the same value', async () => {
    const dispose = vi.fn();
    release('b', dispose);
    retain('b');
    await flush();
    expect(dispose).not.toHaveBeenCalled();
  });
});
