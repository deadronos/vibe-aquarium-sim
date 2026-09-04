import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, InstancedMesh, MeshBasicMaterial, Vector3 } from 'three';
import { world } from '../src/store';
import { resetInstanceCapWarnings } from '../src/systems/instanceCapWarning';
import { createFishRenderState } from '../src/systems/fishRender/fishRenderPools';
import { updateFishInstances } from '../src/systems/fishRender/fishRenderInstances';

const makeMesh = () => new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial(), 1000);

describe('fish render instance updater', () => {
  beforeEach(() => {
    world.entities.length = 0;
    resetInstanceCapWarnings();
  });

  afterEach(() => {
    world.entities.length = 0;
  });

  it('falls back to the primary mesh when a requested variant is unavailable', () => {
    const entity = world.add({
      isFish: true,
      modelIndex: 2,
      position: new Vector3(1, 2, 3),
      velocity: new Vector3(1, 0, 0),
    });
    const state = createFishRenderState();
    const primary = makeMesh();
    const variantOne = makeMesh();
    const variantTwo = makeMesh();

    updateFishInstances({
      state,
      meshes: [primary, variantOne, variantTwo],
      available: [true, false, false],
      adaptiveEnabled: false,
      debug: undefined,
      delta: 1 / 60,
    });

    expect(primary.count).toBe(1);
    expect(variantTwo.count).toBe(0);
    expect(entity.__vibeFishRenderedFrame).toBe(state.frameId);
  });

  it('releases orientation slots when an entity leaves the query', () => {
    const entity = world.add({
      isFish: true,
      position: new Vector3(),
      velocity: new Vector3(1, 0, 0),
    });
    const state = createFishRenderState();
    const meshes: [InstancedMesh, InstancedMesh, InstancedMesh] = [
      makeMesh(),
      makeMesh(),
      makeMesh(),
    ];

    updateFishInstances({
      state,
      meshes,
      available: [true, true, true],
      adaptiveEnabled: false,
      debug: undefined,
      delta: 1 / 60,
    });
    const slot = entity.__vibeFishQuatIndex;
    world.remove(entity);

    updateFishInstances({
      state,
      meshes,
      available: [true, true, true],
      adaptiveEnabled: false,
      debug: undefined,
      delta: 1 / 60,
    });

    expect(entity.__vibeFishQuatIndex).toBeUndefined();
    expect(state.quaternionFreeTop).toBeGreaterThan(0);
    expect(slot).toBeGreaterThanOrEqual(-1);
  });

  it('marks overflow fish as unrendered and warns through the existing cap helper', () => {
    for (let i = 0; i < 1001; i++) {
      world.add({
        isFish: true,
        position: new Vector3(i, 0, 0),
        velocity: new Vector3(1, 0, 0),
      });
    }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = createFishRenderState();

    updateFishInstances({
      state,
      meshes: [makeMesh(), makeMesh(), makeMesh()],
      available: [true, false, false],
      adaptiveEnabled: false,
      debug: undefined,
      delta: 1 / 60,
    });

    const overflow = world.entities[1000]!;
    expect(overflow.__vibeFishRenderedFrame).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('MAX_INSTANCES_PER_MODEL'));
    warn.mockRestore();
  });
});
