export type Float32Buffer = Float32Array<ArrayBufferLike>;
export type Int32Buffer = Int32Array<ArrayBufferLike>;

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
