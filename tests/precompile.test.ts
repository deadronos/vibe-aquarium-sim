import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { precompile } from '../src/scene/precompile';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();

afterEach(() => vi.useRealTimers());

describe('precompile', () => {
  it('waits for the parallel compile when the renderer has one', async () => {
    let finish = () => {};
    const compileAsync = vi.fn(
      () => new Promise<THREE.Object3D>((resolve) => (finish = () => resolve(scene)))
    );
    const gl = { compile: vi.fn(), compileAsync };
    let done = false;
    const pending = precompile(gl, scene, camera).then(() => (done = true));
    await Promise.resolve();
    expect(compileAsync).toHaveBeenCalledWith(scene, camera);
    expect(done).toBe(false);
    finish();
    await pending;
    expect(done).toBe(true);
    expect(gl.compile).not.toHaveBeenCalled();
  });

  it('compiles synchronously when compileAsync is unavailable', async () => {
    const gl = { compile: vi.fn() };
    await precompile(gl, scene, camera);
    expect(gl.compile).toHaveBeenCalledWith(scene, camera);
  });

  it('resolves when compiling fails', async () => {
    await expect(
      precompile(
        { compile: vi.fn(), compileAsync: vi.fn(() => Promise.reject(new Error('x'))) },
        scene,
        camera
      )
    ).resolves.toBeUndefined();
    await expect(
      precompile(
        {
          compile: vi.fn(() => {
            throw new Error('x');
          }),
        },
        scene,
        camera
      )
    ).resolves.toBeUndefined();
  });

  it('gives up waiting after the timeout', async () => {
    vi.useFakeTimers();
    const gl = {
      compile: vi.fn(),
      compileAsync: vi.fn(() => new Promise<THREE.Object3D>(() => {})),
    };
    let done = false;
    void precompile(gl, scene, camera, 1000).then(() => (done = true));
    await vi.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});
