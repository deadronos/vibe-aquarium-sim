export type Float32Buffer = Float32Array<ArrayBufferLike>;

export const ensureCapacity = (buffer: Float32Buffer, needed: number): Float32Buffer => {
  if (buffer.length < needed) {
    return new Float32Array(needed);
  }
  return buffer;
};
