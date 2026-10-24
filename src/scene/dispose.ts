import { useEffect } from 'react';
import * as THREE from 'three';
import { isTextureCopy } from './textures';

/**
 * GPU resources built in `useMemo` are released when their component unmounts (quality toggles,
 * HMR). Releasing waits a microtask so StrictMode's unmount-and-remount, which hands the same
 * memoised value back, keeps it instead of re-uploading it.
 */
const pending = new Map<unknown, () => void>();

/** Cancels a pending `release` of `key`, because it is in use again. */
export const retain = (key: unknown) => {
  pending.delete(key);
};

/** Runs `dispose` after the current commit, unless `retain(key)` is called first. */
export const release = (key: unknown, dispose: () => void) => {
  pending.set(key, dispose);
  queueMicrotask(() => {
    if (pending.get(key) !== dispose) return;
    pending.delete(key);
    dispose();
  });
};

const isPlainObject = (value: object) => {
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
};

/**
 * Disposes `value` and, through arrays and plain objects, everything it holds. A material also
 * frees its copies of the shared procedural textures; the shared originals and other textures
 * (the fish GLB maps) belong to their caches.
 */
export const disposeDeep = (value: unknown) => {
  if (typeof value !== 'object' || value === null) return;
  if (Array.isArray(value)) {
    for (const item of value) disposeDeep(item);
    return;
  }
  if (value instanceof THREE.Material) {
    for (const key of Object.keys(value)) {
      const prop = (value as unknown as Record<string, unknown>)[key];
      if (prop instanceof THREE.Texture && isTextureCopy(prop)) prop.dispose();
    }
    value.dispose();
    return;
  }
  if ('dispose' in value && typeof value.dispose === 'function') {
    (value as { dispose: () => void }).dispose();
    return;
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) disposeDeep(item);
  }
};

/** Disposes a memoised geometry, material or bundle of them when it is replaced or unmounted. */
export const useDispose = (value: unknown) => {
  useEffect(() => {
    retain(value);
    return () => release(value, () => disposeDeep(value));
  }, [value]);
};
