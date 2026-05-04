import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { flushDirtyInstanceMatrices } from '../src/systems/fishRenderFlush';

describe('flushDirtyInstanceMatrices', () => {
  it('flushes dirty matrices within budget and advances the cursor', () => {
    const pool = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()];
    const dirty = new Uint8Array([1, 0, 1]);
    const nextRef = { current: 0 };
    const mesh = {
      instanceMatrix: { needsUpdate: false },
      setMatrixAt: vi.fn(),
    } as unknown as THREE.InstancedMesh;

    const flushed = flushDirtyInstanceMatrices(mesh, pool, dirty, nextRef, 3, 1);

    expect(flushed).toBe(1);
    expect(mesh.setMatrixAt).toHaveBeenCalledWith(0, pool[0]);
    expect(Array.from(dirty)).toEqual([0, 0, 1]);
    expect(nextRef.current).toBe(1);
    expect(mesh.instanceMatrix.needsUpdate).toBe(true);
  });
});
