import { Vector3 } from 'three';

// Constants for spatial hashing
// Supports grid coordinates roughly within +/- 5000
const OFFSET = 5000;
const STRIDE_Y = 20000; // > Range (10000) to avoid column collision
const STRIDE_Z = 400000000; // STRIDE_Y * STRIDE_Y

export class SpatialGrid<T> {
  private cellSize: number;
  // Use number keys (hashed coordinates) instead of strings for performance
  private buckets: Map<number, T[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.buckets = new Map();
  }

  // Convert grid coordinates to a unique integer key
  private getKey(x: number, y: number, z: number): number {
    return x + OFFSET + (y + OFFSET) * STRIDE_Y + (z + OFFSET) * STRIDE_Z;
  }

  clear() {
    this.buckets.clear();
  }

  add(pos: Vector3, item: T) {
    const x = Math.floor(pos.x / this.cellSize);
    const y = Math.floor(pos.y / this.cellSize);
    const z = Math.floor(pos.z / this.cellSize);
    const key = this.getKey(x, y, z);

    if (!this.buckets.has(key)) {
      this.buckets.set(key, []);
    }
    this.buckets.get(key)!.push(item);
  }

  // Optimize: Use a callback and integer math to avoid allocation
  queryCallback(pos: Vector3, radius: number, callback: (item: T) => void) {
    const minX = Math.floor((pos.x - radius) / this.cellSize);
    const maxX = Math.floor((pos.x + radius) / this.cellSize);
    const minY = Math.floor((pos.y - radius) / this.cellSize);
    const maxY = Math.floor((pos.y + radius) / this.cellSize);
    const minZ = Math.floor((pos.z - radius) / this.cellSize);
    const maxZ = Math.floor((pos.z + radius) / this.cellSize);

    // Cache constants for the loop
    const o = OFFSET;
    const sy = STRIDE_Y;
    const sz = STRIDE_Z;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          // Construct key directly to avoid function call overhead
          const key = x + o + (y + o) * sy + (z + o) * sz;
          const items = this.buckets.get(key);
          if (items) {
            for (let i = 0; i < items.length; i++) {
              callback(items[i]);
            }
          }
        }
      }
    }
  }

  query(pos: Vector3, radius: number): T[] {
    const results: T[] = [];
    const minX = Math.floor((pos.x - radius) / this.cellSize);
    const maxX = Math.floor((pos.x + radius) / this.cellSize);
    const minY = Math.floor((pos.y - radius) / this.cellSize);
    const maxY = Math.floor((pos.y + radius) / this.cellSize);
    const minZ = Math.floor((pos.z - radius) / this.cellSize);
    const maxZ = Math.floor((pos.z + radius) / this.cellSize);

    const o = OFFSET;
    const sy = STRIDE_Y;
    const sz = STRIDE_Z;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = x + o + (y + o) * sy + (z + o) * sz;
          const items = this.buckets.get(key);
          if (items) {
            for (let i = 0; i < items.length; i++) {
              results.push(items[i]);
            }
          }
        }
      }
    }
    return results;
  }
}
