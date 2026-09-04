import { InstancedMesh, Object3D, Quaternion, Vector3 } from 'three';
import { world } from '../../store';
import type { Entity } from '../../store';
import { flushDirtyInstanceMatrices } from '../fishRenderFlush';
import { MAX_INSTANCES_PER_MODEL, warnInstanceCap } from '../instanceCapWarning';
import { resolveFishModelIndex } from '../fishModels';
import type { FishRenderFrameResult, FishRenderState } from './fishRenderPools';

const tempObj = new Object3D();
const tempVec = new Vector3();
const tempQuat = new Quaternion();
const FORWARD = new Vector3(0, 0, 1);
const fishEntitiesQuery = world.with('isFish', 'position', 'velocity');
const flushCursorA = { current: 0 };
const flushCursorB = { current: 0 };
const flushCursorC = { current: 0 };

export type FishRenderMeshes = [InstancedMesh, InstancedMesh | null, InstancedMesh | null];

export type FishRenderInstanceContext = {
  state: FishRenderState;
  meshes: FishRenderMeshes;
  available: readonly [boolean, boolean, boolean];
  adaptiveEnabled: boolean;
  instanceUpdateBudget: number;
  delta: number;
};

function releaseStaleOrientations(
  state: FishRenderState,
  previousEntities: Entity[],
  frameId: number
): void {
  for (let i = 0; i < previousEntities.length; i++) {
    const entity = previousEntities[i]!;
    if (entity.__vibeFishSeenFrame === frameId && entity.__vibeFishRenderedFrame === frameId) {
      continue;
    }

    const index = entity.__vibeFishQuatIndex;
    if (
      typeof index === 'number' &&
      index >= 0 &&
      index < state.quaternionPool.length &&
      state.quaternionFreeTop < state.quaternionFreeList.length
    ) {
      state.quaternionFreeList[state.quaternionFreeTop++] = index;
    }
    entity.__vibeFishQuatIndex = undefined;
    entity.__vibeFishRenderedFrame = undefined;
    if (entity.__vibeFishSeenFrame !== frameId) entity.__vibeFishSeenFrame = undefined;
  }
}

function writeFishTransform(
  state: FishRenderState,
  entity: Entity,
  modelIndex: 0 | 1 | 2,
  instanceIndex: number,
  adaptiveEnabled: boolean,
  meshes: FishRenderMeshes
): void {
  tempObj.position.copy(entity.position!);
  let quaternionIndex = entity.__vibeFishQuatIndex;
  if (typeof quaternionIndex !== 'number') quaternionIndex = undefined;
  if (quaternionIndex === undefined) {
    quaternionIndex =
      state.quaternionFreeTop > 0 ? state.quaternionFreeList[--state.quaternionFreeTop]! : -1;
    entity.__vibeFishQuatIndex = quaternionIndex;
  }

  const previous =
    quaternionIndex >= 0 ? state.quaternionPool[quaternionIndex]! : state.quaternionFallback;
  if (entity.velocity && entity.velocity.lengthSq() > 0.005) {
    tempVec.copy(entity.velocity).normalize();
    tempQuat.setFromUnitVectors(FORWARD, tempVec);
    previous.slerp(tempQuat, 0.15);
  }
  tempObj.quaternion.copy(previous);
  tempObj.scale.setScalar(0.3);
  tempObj.updateMatrix();

  const matrixPool = state.matrixPools[modelIndex];
  matrixPool[instanceIndex]!.copy(tempObj.matrix);
  if (adaptiveEnabled) {
    state.dirty[modelIndex][instanceIndex] = 1;
    return;
  }

  meshes[modelIndex]!.setMatrixAt(instanceIndex, tempObj.matrix);
}

export function updateFishInstances(context: FishRenderInstanceContext): FishRenderFrameResult {
  const { state, meshes, available, adaptiveEnabled, instanceUpdateBudget, delta } = context;
  state.frameId++;
  state.elapsedTime += delta;
  const frameId = state.frameId;
  const primaryMesh = meshes[0];
  const variantOneMesh = meshes[1];
  const variantTwoMesh = meshes[2];
  const activeEntities = state.activeEntities;
  const previousEntities = state.previousEntities;
  activeEntities.length = 0;

  let countA = 0;
  let countB = 0;
  let countC = 0;
  let wroteA = false;
  let wroteB = false;
  let wroteC = false;
  const fishEntities = fishEntitiesQuery.entities;

  for (let i = 0, len = fishEntities.length; i < len; i++) {
    const entity = fishEntities[i]!;
    if (!entity.position) continue;
    entity.__vibeFishSeenFrame = frameId;
    activeEntities.push(entity);

    let modelIndex = resolveFishModelIndex(entity.modelIndex ?? Number.NaN, available);
    if ((modelIndex === 1 && !variantOneMesh) || (modelIndex === 2 && !variantTwoMesh)) {
      modelIndex = 0;
    }

    const instanceIndex = modelIndex === 0 ? countA++ : modelIndex === 1 ? countB++ : countC++;
    if (instanceIndex >= MAX_INSTANCES_PER_MODEL) {
      entity.__vibeFishRenderedFrame = undefined;
      warnInstanceCap(modelIndex, fishEntities.length);
      continue;
    }

    entity.__vibeFishRenderedFrame = frameId;
    writeFishTransform(state, entity, modelIndex, instanceIndex, adaptiveEnabled, meshes);
    if (modelIndex === 0) wroteA = true;
    if (modelIndex === 1) wroteB = true;
    if (modelIndex === 2) wroteC = true;
  }

  releaseStaleOrientations(state, previousEntities, frameId);
  previousEntities.length = 0;
  state.activeEntities = previousEntities;
  state.previousEntities = activeEntities;

  primaryMesh.count = Math.min(countA, MAX_INSTANCES_PER_MODEL);
  if (variantOneMesh) variantOneMesh.count = Math.min(countB, MAX_INSTANCES_PER_MODEL);
  if (variantTwoMesh) variantTwoMesh.count = Math.min(countC, MAX_INSTANCES_PER_MODEL);

  let flushed = 0;
  if (adaptiveEnabled) {
    const perModelBudget = Math.ceil((instanceUpdateBudget || 128) / 3);
    flushCursorA.current = state.nextFlush[0];
    flushCursorB.current = state.nextFlush[1];
    flushCursorC.current = state.nextFlush[2];
    flushed += flushDirtyInstanceMatrices(
      primaryMesh,
      state.matrixPools[0],
      state.dirty[0],
      flushCursorA,
      primaryMesh.count,
      perModelBudget
    );
    if (variantOneMesh) {
      flushed += flushDirtyInstanceMatrices(
        variantOneMesh,
        state.matrixPools[1],
        state.dirty[1],
        flushCursorB,
        variantOneMesh.count,
        perModelBudget
      );
    }
    if (variantTwoMesh) {
      flushed += flushDirtyInstanceMatrices(
        variantTwoMesh,
        state.matrixPools[2],
        state.dirty[2],
        flushCursorC,
        variantTwoMesh.count,
        perModelBudget
      );
    }
    state.nextFlush[0] = flushCursorA.current;
    state.nextFlush[1] = flushCursorB.current;
    state.nextFlush[2] = flushCursorC.current;
  } else {
    if (wroteA) primaryMesh.instanceMatrix.needsUpdate = true;
    if (wroteB && variantOneMesh) variantOneMesh.instanceMatrix.needsUpdate = true;
    if (wroteC && variantTwoMesh) variantTwoMesh.instanceMatrix.needsUpdate = true;
  }

  const result = state.renderResult;
  result.countA = countA;
  result.countB = countB;
  result.countC = countC;
  result.activeEntities = activeEntities.length;
  result.wroteA = wroteA;
  result.wroteB = wroteB;
  result.wroteC = wroteC;
  result.flushed = flushed;
  return result;
}
