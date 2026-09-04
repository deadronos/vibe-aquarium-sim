import { Matrix4, Quaternion } from 'three';
import type { Entity } from '../../store';
import { MAX_INSTANCES_PER_MODEL } from '../instanceCapWarning';

export const QUATERNION_POOL_SIZE = MAX_INSTANCES_PER_MODEL * 3;

export type FishRenderStatus = {
  updateFreq: number;
  ema: number;
  activeEntities: number;
  frameDuration: number;
};

export type FishRenderState = {
  frameId: number;
  elapsedTime: number;
  activeEntities: Entity[];
  previousEntities: Entity[];
  quaternionPool: Quaternion[];
  quaternionFallback: Quaternion;
  quaternionFreeList: Int32Array;
  quaternionFreeTop: number;
  matrixPools: [Matrix4[], Matrix4[], Matrix4[]];
  dirty: [Uint8Array, Uint8Array, Uint8Array];
  nextFlush: [number, number, number];
  instanceUpdateEma: number;
  updateFrequency: number;
  renderStatus: FishRenderStatus;
};

const createMatrixPool = (): Matrix4[] => {
  const pool: Matrix4[] = new Array(MAX_INSTANCES_PER_MODEL);
  for (let i = 0; i < MAX_INSTANCES_PER_MODEL; i++) pool[i] = new Matrix4();
  return pool;
};

const createQuaternionPool = (): Quaternion[] => {
  const pool: Quaternion[] = new Array(QUATERNION_POOL_SIZE);
  for (let i = 0; i < QUATERNION_POOL_SIZE; i++) pool[i] = new Quaternion();
  return pool;
};

const createQuaternionFreeList = (): Int32Array => {
  const list = new Int32Array(QUATERNION_POOL_SIZE);
  for (let i = 0; i < QUATERNION_POOL_SIZE; i++) list[i] = i;
  return list;
};

export function createFishRenderState(): FishRenderState {
  return {
    frameId: 0,
    elapsedTime: 0,
    activeEntities: [],
    previousEntities: [],
    quaternionPool: createQuaternionPool(),
    quaternionFallback: new Quaternion(),
    quaternionFreeList: createQuaternionFreeList(),
    quaternionFreeTop: QUATERNION_POOL_SIZE,
    matrixPools: [createMatrixPool(), createMatrixPool(), createMatrixPool()],
    dirty: [
      new Uint8Array(MAX_INSTANCES_PER_MODEL),
      new Uint8Array(MAX_INSTANCES_PER_MODEL),
      new Uint8Array(MAX_INSTANCES_PER_MODEL),
    ],
    nextFlush: [0, 0, 0],
    instanceUpdateEma: 0,
    updateFrequency: 1,
    renderStatus: { updateFreq: 1, ema: 0, activeEntities: 0, frameDuration: 0 },
  };
}

function clearEntityBookkeeping(entities: Entity[]): void {
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]!;
    entity.__vibeFishQuatIndex = undefined;
    entity.__vibeFishSeenFrame = undefined;
    entity.__vibeFishRenderedFrame = undefined;
  }
  entities.length = 0;
}

export function resetFishRenderState(state: FishRenderState): void {
  clearEntityBookkeeping(state.activeEntities);
  clearEntityBookkeeping(state.previousEntities);
  state.frameId = 0;
  state.elapsedTime = 0;
  state.quaternionFreeTop = QUATERNION_POOL_SIZE;
  for (let i = 0; i < QUATERNION_POOL_SIZE; i++) state.quaternionFreeList[i] = i;
  state.dirty[0].fill(0);
  state.dirty[1].fill(0);
  state.dirty[2].fill(0);
  state.nextFlush[0] = 0;
  state.nextFlush[1] = 0;
  state.nextFlush[2] = 0;
  state.instanceUpdateEma = 0;
  state.updateFrequency = 1;
  state.renderStatus.updateFreq = 1;
  state.renderStatus.ema = 0;
  state.renderStatus.activeEntities = 0;
  state.renderStatus.frameDuration = 0;
}

export { MAX_INSTANCES_PER_MODEL };
