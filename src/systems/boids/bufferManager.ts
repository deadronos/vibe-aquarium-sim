import type { Float32Buffer, Int32Buffer } from '../../workers/boids/types';

export type { Float32Buffer, Int32Buffer } from '../../workers/boids/types';

export const ensureCapacity = (buffer: Float32Buffer, needed: number): Float32Buffer => {
  if (buffer.length < needed) {
    return new Float32Array(needed);
  }
  return buffer;
};

export const ensureInt32Capacity = (buffer: Int32Buffer, needed: number): Int32Buffer => {
  if (buffer.length < needed) {
    return new Int32Array(needed);
  }
  return buffer;
};
