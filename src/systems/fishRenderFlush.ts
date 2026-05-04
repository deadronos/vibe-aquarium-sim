import type { MutableRefObject } from 'react';
import type { InstancedMesh, Matrix4 } from 'three';

const MAX_INSTANCES_PER_MODEL = 1000;

export function flushDirtyInstanceMatrices(
  mesh: InstancedMesh | null,
  pool: Matrix4[],
  dirty: Uint8Array,
  nextRef: MutableRefObject<number> | { current: number },
  count: number,
  perModelBudget: number
) {
  if (!mesh || count <= 0) return 0;
  const meshCount = Math.min(count, MAX_INSTANCES_PER_MODEL);
  let flushed = 0;
  let scanned = 0;
  let idx = nextRef.current % meshCount;

  while (flushed < perModelBudget && scanned < meshCount) {
    if (dirty[idx]) {
      mesh.setMatrixAt(idx, pool[idx]);
      dirty[idx] = 0;
      flushed++;
    }
    idx = (idx + 1) % meshCount;
    scanned++;
  }

  nextRef.current = idx;
  if (flushed > 0) mesh.instanceMatrix.needsUpdate = true;
  return flushed;
}
