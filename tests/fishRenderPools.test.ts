import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion } from 'three';
import {
  MAX_INSTANCES_PER_MODEL,
  QUATERNION_POOL_SIZE,
  createFishRenderState,
  resetFishRenderState,
} from '../src/systems/fishRender/fishRenderPools';

describe('fish render pooled state', () => {
  it('creates fixed-size model pools and empty frame collections', () => {
    const state = createFishRenderState();

    expect(state.matrixPools).toHaveLength(3);
    expect(state.matrixPools.every((pool) => pool.length === MAX_INSTANCES_PER_MODEL)).toBe(true);
    expect(state.matrixPools[0]?.[0]).toBeInstanceOf(Matrix4);
    expect(state.quaternionPool).toHaveLength(QUATERNION_POOL_SIZE);
    expect(state.quaternionPool[0]).toBeInstanceOf(Quaternion);
    expect(state.quaternionFreeTop).toBe(QUATERNION_POOL_SIZE);
    expect(state.activeEntities).toHaveLength(0);
    expect(state.previousEntities).toHaveLength(0);
  });

  it('resets pooled entity bookkeeping and free-list state without reallocating arrays', () => {
    const state = createFishRenderState();
    const activeEntities = state.activeEntities;
    const previousEntities = state.previousEntities;
    activeEntities.push({
      __vibeFishQuatIndex: 4,
      __vibeFishSeenFrame: 2,
      __vibeFishRenderedFrame: 2,
    });
    previousEntities.push({
      __vibeFishQuatIndex: 8,
      __vibeFishSeenFrame: 1,
      __vibeFishRenderedFrame: 1,
    });
    state.quaternionFreeTop = 0;

    resetFishRenderState(state);

    expect(state.activeEntities).toBe(activeEntities);
    expect(state.previousEntities).toBe(previousEntities);
    expect(activeEntities).toHaveLength(0);
    expect(previousEntities).toHaveLength(0);
    expect(state.quaternionFreeTop).toBe(QUATERNION_POOL_SIZE);
    expect(state.quaternionFreeList[0]).toBe(0);
    expect(state.quaternionFreeList[QUATERNION_POOL_SIZE - 1]).toBe(QUATERNION_POOL_SIZE - 1);
  });
});
